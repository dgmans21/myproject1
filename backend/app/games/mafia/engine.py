"""Mafia game engine — prototype on shared GameEngine infra."""

from __future__ import annotations

import random
from typing import Any

from fastapi import HTTPException

from app.games.engine.base import GameEngine, GameState, PlayMode, Player, utc_now
from app.games.mafia.roles import (
    DOCTOR_SELF_HINT,
    MAFIA_TEAM,
    MAX_PLAYERS,
    MIN_PLAYERS,
    ROLE_CITIZEN,
    ROLE_DOCTOR,
    ROLE_LABELS_KO,
    ROLE_MAFIA,
    ROLE_POLICE,
    ROLE_SPY,
    ROLE_VIGILANTE,
    SPECIAL_ROLES,
    TOWN_SPECIAL,
    VIGILANTE_ALLY_FAIL_QUOTE,
    VIGILANTE_FAIL_QUOTE,
)

# Phases
ROLE_REVEAL = "ROLE_REVEAL"
NIGHT = "NIGHT"
NIGHT_RESULT = "NIGHT_RESULT"
DAY_DISCUSSION = "DAY_DISCUSSION"
VOTE = "VOTE"
REVOTE = "REVOTE"
EXECUTION = "EXECUTION"
ROUND_SCORE = "ROUND_SCORE"
ENDED = "ENDED"

SCORE_WIN = 100
SCORE_LOSE_CITIZEN = 0
SCORE_LOSE_SPECIAL = -50
SCORE_BONUS_POLICE = 100
SCORE_BONUS_VIGILANTE = 100
SCORE_BONUS_DOCTOR = 100
SCORE_BONUS_MAFIA_KILL_SPECIAL = 50


class MafiaEngine(GameEngine):
    game_type = "mafia"

    def create(self, *, room_id: str, host_user_id: str, config: dict[str, Any]) -> GameState:
        play_mode = PlayMode(config.get("play_mode", "moderator"))
        total_rounds = int(config.get("total_rounds", 1))
        if total_rounds < 1 or total_rounds > 10:
            raise HTTPException(status_code=400, detail="라운드 수는 1~10이어야 합니다")

        discussion_seconds = int(config.get("discussion_seconds", 120))
        if discussion_seconds < 10 or discussion_seconds > 600:
            raise HTTPException(status_code=400, detail="토론 시간은 10~600초입니다")

        role_reveal_on_death = bool(config.get("role_reveal_on_death", True))
        bot_count = int(config.get("bot_count", 0))
        if bot_count < 0 or bot_count > 8:
            raise HTTPException(status_code=400, detail="봇 수는 0~8입니다")

        counts = {
            ROLE_MAFIA: int(config.get("mafia_count", 1)),
            ROLE_SPY: int(config.get("spy_count", 0)),
            ROLE_DOCTOR: int(config.get("doctor_count", 1)),
            ROLE_POLICE: int(config.get("police_count", 1)),
            ROLE_VIGILANTE: int(config.get("vigilante_count", 0)),
        }
        for k, v in counts.items():
            if v < 0 or v > 5:
                raise HTTPException(status_code=400, detail=f"{k} 수가 올바르지 않습니다")

        players = self._build_players(play_mode, host_user_id, config, bot_count)
        n = len(players)
        if n < MIN_PLAYERS:
            raise HTTPException(status_code=400, detail=f"최소 {MIN_PLAYERS}명(봇 포함)이 필요합니다")
        if n > MAX_PLAYERS:
            raise HTTPException(status_code=400, detail=f"최대 {MAX_PLAYERS}명까지입니다")

        mafia_side = counts[ROLE_MAFIA] + counts[ROLE_SPY]
        special_sum = sum(counts.values())
        if mafia_side < 1:
            raise HTTPException(status_code=400, detail="마피아 진영이 최소 1명 필요합니다")
        if mafia_side >= n / 2:
            raise HTTPException(status_code=400, detail="마피아 진영은 인원의 절반 미만이어야 합니다")
        if special_sum > n:
            raise HTTPException(status_code=400, detail="직업 수 합이 인원보다 많습니다")

        # Moderator does not play as a secret role viewer for night — but can be in player list
        # Spec: mafia moderator is non-participant dealer. For prototype allow host_joins like liar
        # unless play_mode moderator and host_joins false.
        if play_mode == PlayMode.MODERATOR and not config.get("host_joins", False):
            # unlink host from players
            for p in players:
                if p.user_id == host_user_id and not p.is_bot:
                    p.user_id = None

        state = GameState(
            game_id=GameState.new_id(),
            game_type=self.game_type,
            room_id=room_id,
            host_user_id=host_user_id,
            play_mode=play_mode,
            phase=ROLE_REVEAL,
            players=players,
            total_rounds=total_rounds,
            current_round=1,
            payload={
                "role_counts": counts,
                "role_reveal_on_death": role_reveal_on_death,
                "discussion_seconds": discussion_seconds,
                "night_index": 0,
                "turn_index": 0,
                "roles": {},
                "alive": [],
                "reveal_index": 0,
                "night_actions": {},
                "pending_investigate": {},
                "last_night": {},
                "day": {},
                "stats": {},
                "round_delta": {},
                "public_log": [],
            },
        )
        self._start_round(state)
        return state

    def _build_players(
        self,
        play_mode: PlayMode,
        host_user_id: str,
        config: dict[str, Any],
        bot_count: int,
    ) -> list[Player]:
        players: list[Player] = []
        if play_mode == PlayMode.MODERATOR:
            names = config.get("player_names") or []
            if not isinstance(names, list) or len(names) < 1:
                raise HTTPException(status_code=400, detail="플레이어 이름을 입력하세요")
            for i, raw in enumerate(names, start=1):
                name = str(raw).strip() or f"플레이어{i}"
                players.append(Player(player_id=f"p{i}", display_name=name[:20], user_id=None))
            if config.get("host_joins", False) and players:
                players[0].user_id = host_user_id
        else:
            user_ids = config.get("player_user_ids") or []
            names_map = config.get("player_display_names") or {}
            if not isinstance(user_ids, list) or not user_ids:
                raise HTTPException(status_code=400, detail="참가할 멤버를 선택하세요")
            if host_user_id not in user_ids:
                user_ids = [host_user_id, *user_ids]
            seen: set[str] = set()
            for i, uid in enumerate(user_ids, start=1):
                uid = str(uid)
                if uid in seen:
                    continue
                seen.add(uid)
                label = str(names_map.get(uid) or f"플레이어{i}")[:20]
                players.append(Player(player_id=uid, display_name=label, user_id=uid))

        for i in range(1, bot_count + 1):
            players.append(
                Player(
                    player_id=f"bot-{i}",
                    display_name=f"봇{i}",
                    user_id=f"bot-{i}",
                    is_bot=True,
                )
            )
        return players

    def _start_round(self, state: GameState) -> None:
        counts = dict(state.payload["role_counts"])
        n = len(state.players)
        special_sum = sum(counts.values())
        citizens = n - special_sum
        bag: list[str] = []
        for role, c in counts.items():
            bag.extend([role] * c)
        bag.extend([ROLE_CITIZEN] * citizens)
        random.shuffle(bag)

        roles: dict[str, str] = {}
        for p, role in zip(state.players, bag):
            roles[p.player_id] = role

        state.payload["roles"] = roles
        state.payload["alive"] = [p.player_id for p in state.players]
        state.payload["reveal_index"] = 0
        state.payload["night_index"] = 0
        state.payload["turn_index"] = 0
        state.payload["night_actions"] = {}
        state.payload["pending_investigate"] = {}
        state.payload["last_night"] = {}
        state.payload["day"] = {}
        state.payload["public_log"] = []
        state.payload["round_delta"] = {}
        # per-round stats for bonuses
        state.payload["stats"] = {
            "doctor_other_heals": {p.player_id: 0 for p in state.players},
            "doctor_last_self": {p.player_id: False for p in state.players},
            "doctor_self_count": {p.player_id: 0 for p in state.players},
            "spy_used": {p.player_id: False for p in state.players},
            "police_marked": {},  # police_id -> set of mafia-side investigated who later executed
            "police_investigated_mafia": {p.player_id: [] for p in state.players},
            "vigilante_early_mafia_kill": False,
            "vigilante_last_night": {},  # vig_id -> night_index of last shot
            "mafia_early_special_kills": [],
            "executed_this_round": [],
        }
        state.payload["revealed_roles"] = {}
        state.set_phase(ROLE_REVEAL)

    # --- actions ---

    def apply_action(
        self,
        state: GameState,
        *,
        actor_user_id: str,
        action: str,
        data: dict[str, Any] | None = None,
    ) -> GameState:
        if state.ended and action != "force_end":
            raise HTTPException(status_code=400, detail="이미 종료된 게임입니다")
        data = data or {}
        is_host = actor_user_id == state.host_user_id

        if action == "force_end":
            if not is_host:
                raise HTTPException(status_code=403, detail="방장만 종료할 수 있습니다")
            state.set_phase(ENDED)
            state.ended = True
            self._resolve_winner(state)
            return state

        handlers = {
            "advance_reveal": self._act_advance_reveal,
            "finish_reveal": self._act_finish_reveal,
            "night_action": self._act_night_action,
            "moderator_night_action": self._act_moderator_night_action,
            "ack_night_result": self._act_ack_night_result,
            "end_discussion": self._act_end_discussion,
            "cast_vote": self._act_cast_vote,
            "moderator_vote_result": self._act_moderator_vote_result,
            "ack_execution": self._act_ack_execution,
            "ack_round_score": self._act_ack_round_score,
        }
        fn = handlers.get(action)
        if not fn:
            raise HTTPException(status_code=400, detail=f"알 수 없는 액션: {action}")
        return fn(state, actor_user_id=actor_user_id, is_host=is_host, data=data)

    def _require(self, state: GameState, *phases: str) -> None:
        if state.phase not in phases:
            raise HTTPException(status_code=400, detail=f"현재 단계({state.phase})에서 불가합니다")

    def _alive(self, state: GameState) -> list[str]:
        return list(state.payload.get("alive") or [])

    def _role(self, state: GameState, pid: str) -> str:
        return state.payload["roles"].get(pid, ROLE_CITIZEN)

    def _is_mafia_side(self, state: GameState, pid: str) -> bool:
        return self._role(state, pid) in MAFIA_TEAM

    def _act_advance_reveal(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, ROLE_REVEAL)
        if state.play_mode != PlayMode.MODERATOR or not is_host:
            raise HTTPException(status_code=403, detail="사회자만 가능합니다")
        idx = int(state.payload.get("reveal_index", 0))
        # skip bots
        while idx < len(state.players) and state.players[idx].is_bot:
            idx += 1
        if idx < len(state.players):
            idx += 1
            while idx < len(state.players) and state.players[idx].is_bot:
                idx += 1
        state.payload["reveal_index"] = idx
        return state

    def _act_finish_reveal(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, ROLE_REVEAL)
        if not is_host:
            raise HTTPException(status_code=403, detail="방장만 가능합니다")
        self._begin_night(state)
        return state

    def _begin_night(self, state: GameState) -> None:
        state.payload["night_index"] = int(state.payload.get("night_index", 0)) + 1
        state.payload["turn_index"] = int(state.payload.get("turn_index", 0)) + 1
        state.payload["night_actions"] = {}
        state.payload["pending_investigate"] = {}
        state.set_phase(NIGHT)
        self._auto_bot_night(state)
        self._maybe_resolve_night(state)

    def _vigilante_can_act(self, state: GameState, vig_id: str) -> bool:
        """First night banned; then once every 3 nights (cooldown from last shot)."""
        night = int(state.payload.get("night_index") or 0)
        if night <= 1:
            return False
        last = (state.payload.get("stats") or {}).get("vigilante_last_night") or {}
        last_n = last.get(vig_id)
        if last_n is None:
            return True
        return night - int(last_n) >= 3

    def _night_actors_needed(self, state: GameState) -> list[str]:
        """Recommended input order: mafia first (easy to spot), then town night roles."""
        needed: list[str] = []
        alive = set(self._alive(state))
        mafia_alive = [pid for pid in alive if self._role(state, pid) == ROLE_MAFIA]
        if mafia_alive:
            needed.append("mafia_kill")
        # town / special in fixed order for moderator cognition
        for role, prefix in (
            (ROLE_DOCTOR, "doctor"),
            (ROLE_POLICE, "police"),
            (ROLE_SPY, "spy"),
            (ROLE_VIGILANTE, "vigilante"),
        ):
            for pid in alive:
                if self._role(state, pid) != role:
                    continue
                if role == ROLE_SPY and state.payload["stats"]["spy_used"].get(pid):
                    continue
                if role == ROLE_VIGILANTE and not self._vigilante_can_act(state, pid):
                    continue
                needed.append(f"{prefix}:{pid}")
        return needed

    def _auto_bot_night(self, state: GameState) -> None:
        alive = [pid for pid in self._alive(state)]
        actions = state.payload["night_actions"]
        # mafia kill
        mafia_bots = [
            p
            for p in state.players
            if p.is_bot and p.player_id in alive and self._role(state, p.player_id) == ROLE_MAFIA
        ]
        human_mafia = [
            p
            for p in state.players
            if (not p.is_bot)
            and p.player_id in alive
            and self._role(state, p.player_id) == ROLE_MAFIA
        ]
        if mafia_bots and not human_mafia and "mafia_kill" not in actions:
            targets = [pid for pid in alive if not self._is_mafia_side(state, pid)]
            if targets:
                actions["mafia_kill"] = random.choice(targets)

        for p in state.players:
            if not p.is_bot or p.player_id not in alive:
                continue
            role = self._role(state, p.player_id)
            key = None
            target = None
            others = [x for x in alive if x != p.player_id]
            if role == ROLE_DOCTOR:
                key = f"doctor:{p.player_id}"
                # avoid consecutive self if last was self
                if state.payload["stats"]["doctor_last_self"].get(p.player_id):
                    target = random.choice(others) if others else p.player_id
                else:
                    target = random.choice(alive)
            elif role == ROLE_POLICE:
                key = f"police:{p.player_id}"
                target = random.choice(others) if others else None
            elif role == ROLE_SPY:
                if state.payload["stats"]["spy_used"].get(p.player_id):
                    continue
                key = f"spy:{p.player_id}"
                target = random.choice(others) if others else None
            elif role == ROLE_VIGILANTE:
                if not self._vigilante_can_act(state, p.player_id):
                    continue
                key = f"vigilante:{p.player_id}"
                target = random.choice(others) if others else None
            if key and target and key not in actions:
                actions[key] = target

        # if only bots for mafia and no kill yet handled above
        state.payload["night_actions"] = actions

    def _act_night_action(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, NIGHT)
        if state.play_mode != PlayMode.REMOTE:
            raise HTTPException(status_code=400, detail="온라인 파티에서만 개별 밤 행동을 합니다")
        me = state.player_by_user_id(actor_user_id)
        if not me or me.player_id not in self._alive(state):
            raise HTTPException(status_code=403, detail="생존 참가자만 가능합니다")
        target = str(data.get("target_player_id") or "")
        if target not in self._alive(state):
            raise HTTPException(status_code=400, detail="잘못된 대상입니다")
        role = self._role(state, me.player_id)
        actions = state.payload["night_actions"]

        if role == ROLE_MAFIA:
            if target == me.player_id or self._is_mafia_side(state, target):
                raise HTTPException(status_code=400, detail="동료/자신은 선택할 수 없습니다")
            actions["mafia_kill"] = target
        elif role == ROLE_DOCTOR:
            if state.payload["stats"]["doctor_last_self"].get(me.player_id) and target == me.player_id:
                raise HTTPException(status_code=400, detail="연속 자가치유는 불가합니다")
            actions[f"doctor:{me.player_id}"] = target
        elif role == ROLE_POLICE:
            if target == me.player_id:
                raise HTTPException(status_code=400, detail="자신을 조사할 수 없습니다")
            actions[f"police:{me.player_id}"] = target
        elif role == ROLE_SPY:
            if state.payload["stats"]["spy_used"].get(me.player_id):
                raise HTTPException(status_code=400, detail="스파이 조사는 게임당 1회입니다")
            if target == me.player_id:
                raise HTTPException(status_code=400, detail="자신을 조사할 수 없습니다")
            actions[f"spy:{me.player_id}"] = target
        elif role == ROLE_VIGILANTE:
            if not self._vigilante_can_act(state, me.player_id):
                raise HTTPException(
                    status_code=400,
                    detail="자경단 처형은 첫날밤 불가 · 3밤마다 1회입니다",
                )
            if target == me.player_id:
                raise HTTPException(status_code=400, detail="자신을 지정할 수 없습니다")
            actions[f"vigilante:{me.player_id}"] = target
        else:
            raise HTTPException(status_code=400, detail="밤 행동이 없는 직업입니다")

        state.payload["night_actions"] = actions
        self._maybe_resolve_night(state)
        return state

    def _act_moderator_night_action(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, NIGHT)
        if state.play_mode != PlayMode.MODERATOR or not is_host:
            raise HTTPException(status_code=403, detail="사회자만 대행 입력할 수 있습니다")
        action_key = str(data.get("action_key") or "")
        target = str(data.get("target_player_id") or "")
        if target and target not in self._alive(state):
            raise HTTPException(status_code=400, detail="잘못된 대상입니다")
        needed = self._night_actors_needed(state)
        if action_key not in needed:
            raise HTTPException(status_code=400, detail="지금은 그 행동을 받을 수 없습니다")
        # basic validation
        if action_key.startswith("doctor:"):
            doc_id = action_key.split(":", 1)[1]
            if state.payload["stats"]["doctor_last_self"].get(doc_id) and target == doc_id:
                raise HTTPException(status_code=400, detail="연속 자가치유는 불가합니다")
        if action_key == "mafia_kill" and self._is_mafia_side(state, target):
            raise HTTPException(status_code=400, detail="마피아 진영은 고를 수 없습니다")
        state.payload["night_actions"][action_key] = target
        self._auto_bot_night(state)
        self._maybe_resolve_night(state)
        return state

    def _maybe_resolve_night(self, state: GameState) -> None:
        needed = set(self._night_actors_needed(state))
        have = set(state.payload["night_actions"].keys())
        # spy may skip by submitting null? for prototype require action or mark skip
        # if spy needed but not used - wait. Optional skip via target ""
        pending = needed - have
        if pending:
            return
        self._resolve_night(state)

    def _resolve_night(self, state: GameState) -> None:
        actions = dict(state.payload["night_actions"])
        alive = set(self._alive(state))
        turn = int(state.payload.get("turn_index", 1))
        stats = state.payload["stats"]

        kill_marks: dict[str, str] = {}  # pid -> reason (mafia|vigilante|vigilante_suicide)
        heal_immune: set[str] = set()

        # mafia kill
        mk = actions.get("mafia_kill")
        if mk and mk in alive:
            kill_marks[mk] = "mafia"

        # vigilante
        # mafia/spy → 성공(대상 사망)
        # doctor/police/다른 자경단 → 대상 사망 + 실패 멘트 + 자경단 정체 공개
        # citizen → 대상+자폭
        ally_fails: list[str] = []
        for key, target in list(actions.items()):
            if not key.startswith("vigilante:"):
                continue
            vig_id = key.split(":", 1)[1]
            if vig_id not in alive or target not in alive:
                continue
            if not self._vigilante_can_act(state, vig_id):
                continue
            night = int(state.payload.get("night_index") or 0)
            stats.setdefault("vigilante_last_night", {})[vig_id] = night
            t_role = self._role(state, target)
            if t_role in MAFIA_TEAM:
                kill_marks[target] = "vigilante"
                if turn <= 3:
                    stats["vigilante_early_mafia_kill"] = True
            elif t_role in TOWN_SPECIAL:
                kill_marks[target] = "vigilante"
                ally_fails.append(vig_id)
            else:
                kill_marks[target] = "vigilante"
                kill_marks[vig_id] = "vigilante_suicide"
                heal_immune.add(vig_id)

        # doctor heals
        healed: set[str] = set()
        for key, target in list(actions.items()):
            if not key.startswith("doctor:"):
                continue
            doc_id = key.split(":", 1)[1]
            if doc_id not in alive:
                continue
            if target in alive:
                healed.add(target)
            if target == doc_id:
                stats["doctor_last_self"][doc_id] = True
                stats["doctor_self_count"][doc_id] = int(stats["doctor_self_count"].get(doc_id, 0)) + 1
            else:
                stats["doctor_last_self"][doc_id] = False
                stats["doctor_other_heals"][doc_id] = int(stats["doctor_other_heals"].get(doc_id, 0)) + 1

        for pid in list(kill_marks.keys()):
            if pid in healed and pid not in heal_immune and kill_marks[pid] != "vigilante_suicide":
                del kill_marks[pid]

        # investigate (pre-death state)
        investigate_results: dict[str, dict[str, Any]] = {}
        for key, target in list(actions.items()):
            if key.startswith("police:"):
                pol_id = key.split(":", 1)[1]
                if pol_id not in alive:
                    continue
                is_mafia = self._is_mafia_side(state, target)
                investigate_results[pol_id] = {
                    "type": "police",
                    "target_player_id": target,
                    "is_mafia_side": is_mafia,
                }
                if is_mafia:
                    lst = list(stats["police_investigated_mafia"].get(pol_id) or [])
                    if target not in lst:
                        lst.append(target)
                    stats["police_investigated_mafia"][pol_id] = lst
            elif key.startswith("spy:"):
                spy_id = key.split(":", 1)[1]
                if spy_id not in alive:
                    continue
                stats["spy_used"][spy_id] = True
                investigate_results[spy_id] = {
                    "type": "spy",
                    "target_player_id": target,
                    "has_special_role": self._role(state, target) in SPECIAL_ROLES,
                }

        # deaths
        deaths: list[dict[str, Any]] = []
        public_log: list[str] = []
        for pid, reason in kill_marks.items():
            if pid not in alive:
                continue
            alive.discard(pid)
            role = self._role(state, pid)
            entry: dict[str, Any] = {"player_id": pid, "reason": reason}
            if state.payload.get("role_reveal_on_death"):
                entry["role"] = role
                entry["role_label"] = ROLE_LABELS_KO.get(role, role)
            deaths.append(entry)
            name = state.player_by_id(pid).display_name if state.player_by_id(pid) else pid
            if reason == "vigilante_suicide":
                public_log.append(VIGILANTE_FAIL_QUOTE)
                public_log.append(f"{name} 사망")
            else:
                public_log.append(f"{name} 사망")
            # mafia early special kill bonus tracking
            if reason == "mafia" and role in TOWN_SPECIAL and turn <= 3:
                killers = [
                    p.player_id
                    for p in state.players
                    if self._role(state, p.player_id) == ROLE_MAFIA
                ]
                for kid in killers:
                    if kid not in stats["mafia_early_special_kills"]:
                        # record victim for uniqueness
                        pass
                stats["mafia_early_special_kills"].append({"victim": pid, "role": role})

        # 자경단이 의사·경찰 등 아군 특수를 처치 → 실패 멘트 + 정체 공개 (생존해도 공개)
        revealed = dict(state.payload.get("revealed_roles") or {})
        for vig_id in ally_fails:
            vig = state.player_by_id(vig_id)
            vname = vig.display_name if vig else vig_id
            public_log.append(VIGILANTE_ALLY_FAIL_QUOTE)
            public_log.append(f"{vname}의 정체가 드러났습니다 · 자경단")
            revealed[vig_id] = ROLE_VIGILANTE
        state.payload["revealed_roles"] = revealed

        # doctor self hint
        for pid, cnt in stats["doctor_self_count"].items():
            if cnt >= 3 and pid in alive:
                public_log.append(DOCTOR_SELF_HINT)
                break

        # drop investigate if investigator died
        delivered: dict[str, Any] = {}
        for inv_id, result in investigate_results.items():
            if inv_id in alive:
                delivered[inv_id] = result

        state.payload["alive"] = list(alive)
        state.payload["last_night"] = {
            "deaths": deaths,
            "public_log": public_log,
            "investigate": delivered,
        }
        state.payload["public_log"] = list(state.payload.get("public_log") or []) + public_log
        state.set_phase(NIGHT_RESULT)

        # win check after night
        winner = self._camp_winner(state)
        if winner:
            self._finish_round(state, winner)
            return

    def _camp_winner(self, state: GameState) -> str | None:
        alive = self._alive(state)
        mafia = [pid for pid in alive if self._is_mafia_side(state, pid)]
        town = [pid for pid in alive if not self._is_mafia_side(state, pid)]
        if not mafia:
            return "town"
        if len(mafia) >= len(town):
            return "mafia"
        return None

    def _act_ack_night_result(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, NIGHT_RESULT)
        if not is_host:
            raise HTTPException(status_code=403, detail="방장만 가능합니다")
        if state.phase == ROUND_SCORE:
            return state
        secs = int(state.payload.get("discussion_seconds") or 120)
        state.set_phase(DAY_DISCUSSION, duration_seconds=secs)
        state.payload["day"] = {"votes": {}, "revote": False, "accused": None}
        state.payload["discussion_expired"] = False
        return state

    def _act_end_discussion(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, DAY_DISCUSSION)
        if not is_host:
            raise HTTPException(status_code=403, detail="방장만 가능합니다")
        state.payload["discussion_expired"] = False
        state.set_phase(VOTE)
        self._auto_bot_vote(state)
        return state

    def _auto_bot_vote(self, state: GameState) -> None:
        day = state.payload.setdefault("day", {"votes": {}})
        votes = dict(day.get("votes") or {})
        alive = self._alive(state)
        for p in state.players:
            if not p.is_bot or p.player_id not in alive:
                continue
            if p.player_id in votes:
                continue
            others = [x for x in alive if x != p.player_id]
            if others:
                votes[p.player_id] = random.choice(others)
        day["votes"] = votes
        state.payload["day"] = day
        if state.play_mode == PlayMode.REMOTE and len(votes) >= len(alive):
            self._resolve_votes(state)

    def _act_cast_vote(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, VOTE, REVOTE)
        if state.play_mode != PlayMode.REMOTE:
            raise HTTPException(status_code=400, detail="온라인 파티에서만 개별 투표합니다")
        me = state.player_by_user_id(actor_user_id)
        if not me or me.player_id not in self._alive(state):
            raise HTTPException(status_code=403, detail="생존자만 투표할 수 있습니다")
        target = data.get("target_player_id")
        if target is None or target == "":
            # abstain
            day = state.payload.setdefault("day", {"votes": {}})
            votes = dict(day.get("votes") or {})
            votes[me.player_id] = ""
            day["votes"] = votes
        else:
            target = str(target)
            if target not in self._alive(state) or target == me.player_id:
                raise HTTPException(status_code=400, detail="잘못된 투표 대상입니다")
            day = state.payload.setdefault("day", {"votes": {}})
            votes = dict(day.get("votes") or {})
            votes[me.player_id] = target
            day["votes"] = votes
        state.payload["day"] = day
        alive_n = len(self._alive(state))
        if len(votes) >= alive_n:
            self._resolve_votes(state)
        return state

    def _act_moderator_vote_result(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, VOTE, REVOTE)
        if state.play_mode != PlayMode.MODERATOR or not is_host:
            raise HTTPException(status_code=403, detail="사회자만 가능합니다")
        # target_player_id null => no execution; or explicit
        target = data.get("target_player_id")
        day = state.payload.setdefault("day", {})
        if target is None or target == "" or target == "none":
            day["accused"] = None
            day["no_execution"] = True
            self._goto_execution(state, None)
        else:
            target = str(target)
            if target not in self._alive(state):
                raise HTTPException(status_code=400, detail="잘못된 대상입니다")
            day["accused"] = target
            self._goto_execution(state, target)
        return state

    def _resolve_votes(self, state: GameState) -> None:
        day = state.payload.setdefault("day", {})
        votes: dict[str, str] = dict(day.get("votes") or {})
        alive = self._alive(state)
        tallies: dict[str, int] = {}
        for t in votes.values():
            if not t:
                continue
            tallies[t] = tallies.get(t, 0) + 1
        majority = (len(alive) // 2) + 1
        if not tallies:
            self._handle_no_execution_or_revote(state, tied=False)
            return
        max_v = max(tallies.values())
        leaders = [pid for pid, c in tallies.items() if c == max_v]
        if max_v < majority:
            self._handle_no_execution_or_revote(state, tied=False)
            return
        if len(leaders) > 1:
            self._handle_no_execution_or_revote(state, tied=True)
            return
        self._goto_execution(state, leaders[0])

    def _handle_no_execution_or_revote(self, state: GameState, *, tied: bool) -> None:
        alive_n = len(self._alive(state))
        day = state.payload.setdefault("day", {})
        already = bool(day.get("revote"))
        if tied and alive_n <= 4 and not already and state.phase == VOTE:
            day["revote"] = True
            day["votes"] = {}
            state.payload["day"] = day
            state.set_phase(REVOTE)
            self._auto_bot_vote(state)
            return
        self._goto_execution(state, None)

    def _goto_execution(self, state: GameState, accused: str | None) -> None:
        day = state.payload.setdefault("day", {})
        day["accused"] = accused
        deaths: list[dict[str, Any]] = []
        if accused and accused in self._alive(state):
            alive = self._alive(state)
            alive = [x for x in alive if x != accused]
            state.payload["alive"] = alive
            role = self._role(state, accused)
            entry: dict[str, Any] = {"player_id": accused, "reason": "execution"}
            if state.payload.get("role_reveal_on_death"):
                entry["role"] = role
                entry["role_label"] = ROLE_LABELS_KO.get(role, role)
            deaths.append(entry)
            # police bonus: if executed was investigated as mafia by someone within 3 turns
            turn = int(state.payload.get("turn_index", 1))
            stats = state.payload["stats"]
            if turn <= 3 and role in MAFIA_TEAM:
                for pol_id, lst in (stats.get("police_investigated_mafia") or {}).items():
                    if accused in (lst or []):
                        stats.setdefault("police_catch", {})
                        stats["police_catch"][pol_id] = True
            stats.setdefault("executed_this_round", []).append(accused)

        day["execution_deaths"] = deaths
        state.payload["day"] = day
        state.set_phase(EXECUTION)

        winner = self._camp_winner(state)
        if winner:
            # still show execution then host ack -> score
            state.payload["pending_round_winner"] = winner

    def _act_ack_execution(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, EXECUTION)
        if not is_host:
            raise HTTPException(status_code=403, detail="방장만 가능합니다")
        pending = state.payload.pop("pending_round_winner", None)
        if pending:
            self._finish_round(state, pending)
            return state
        winner = self._camp_winner(state)
        if winner:
            self._finish_round(state, winner)
            return state
        self._begin_night(state)
        return state

    def _finish_round(self, state: GameState, winner: str) -> None:
        """winner: town | mafia"""
        delta: dict[str, int] = {}
        roles = state.payload["roles"]
        stats = state.payload["stats"]
        turn = int(state.payload.get("turn_index", 1))

        for p in state.players:
            role = roles.get(p.player_id, ROLE_CITIZEN)
            is_mafia = role in MAFIA_TEAM
            won = (winner == "mafia" and is_mafia) or (winner == "town" and not is_mafia)
            if won:
                delta[p.player_id] = SCORE_WIN
            else:
                if role == ROLE_CITIZEN:
                    delta[p.player_id] = SCORE_LOSE_CITIZEN
                else:
                    delta[p.player_id] = SCORE_LOSE_SPECIAL

        # bonuses
        if turn <= 3 or True:
            for pol_id, ok in (stats.get("police_catch") or {}).items():
                if ok and int(state.payload.get("turn_index", 99)) <= 3:
                    delta[pol_id] = delta.get(pol_id, 0) + SCORE_BONUS_POLICE
            if stats.get("vigilante_early_mafia_kill"):
                for p in state.players:
                    if roles.get(p.player_id) == ROLE_VIGILANTE:
                        delta[p.player_id] = delta.get(p.player_id, 0) + SCORE_BONUS_VIGILANTE
            for doc_id, cnt in (stats.get("doctor_other_heals") or {}).items():
                if cnt >= 3:
                    delta[doc_id] = delta.get(doc_id, 0) + SCORE_BONUS_DOCTOR
            # mafia early special kills — unique victims, grant to all living mafia at end? Spec: mafia who killed
            # grant +50 once per unique special victim to each mafia player (simple)
            seen_v = set()
            bonus_times = 0
            for item in stats.get("mafia_early_special_kills") or []:
                vid = item.get("victim")
                if vid and vid not in seen_v:
                    seen_v.add(vid)
                    bonus_times += 1
            if bonus_times:
                for p in state.players:
                    if roles.get(p.player_id) == ROLE_MAFIA:
                        delta[p.player_id] = delta.get(p.player_id, 0) + (
                            SCORE_BONUS_MAFIA_KILL_SPECIAL * bonus_times
                        )

        for p in state.players:
            add = delta.get(p.player_id, 0)
            p.score += add
        state.payload["round_delta"] = delta
        state.payload["round_winner"] = winner
        state.set_phase(ROUND_SCORE)

    def _act_ack_round_score(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require(state, ROUND_SCORE)
        if not is_host:
            raise HTTPException(status_code=403, detail="방장만 가능합니다")
        if state.current_round >= state.total_rounds:
            state.set_phase(ENDED)
            state.ended = True
            self._resolve_winner(state)
            return state
        state.current_round += 1
        self._start_round(state)
        return state

    def _resolve_winner(self, state: GameState) -> None:
        if not state.players:
            return
        best = max(p.score for p in state.players)
        tied = [p for p in state.players if p.score == best]
        winner = random.choice(tied)
        state.winner_player_id = winner.player_id
        state.payload["winner_tiebreak"] = len(tied) > 1

    def tick(self, state: GameState) -> GameState | None:
        if state.ended or state.phase_duration_seconds is None:
            return None
        try:
            from datetime import datetime

            t0 = datetime.fromisoformat(state.phase_started_at)
        except Exception:
            return None
        elapsed = (utc_now() - t0).total_seconds()
        if elapsed < state.phase_duration_seconds:
            return None
        if state.phase == DAY_DISCUSSION:
            # Moderator table: notify only — host presses "투표 시작".
            # Remote: auto-advance so online parties keep pace.
            if state.play_mode == PlayMode.REMOTE:
                state.set_phase(VOTE)
                self._auto_bot_vote(state)
                return state
            if state.payload.get("discussion_expired"):
                return None
            state.payload["discussion_expired"] = True
            state.phase_duration_seconds = None
            return state
        return None

    def project(self, state: GameState, viewer_user_id: str) -> dict[str, Any]:
        is_host = viewer_user_id == state.host_user_id
        me = state.player_by_user_id(viewer_user_id)
        roles = state.payload.get("roles") or {}
        alive = self._alive(state)
        reveal_on = bool(state.payload.get("role_reveal_on_death"))

        players_view = []
        for p in state.players:
            row = p.to_public()
            row["alive"] = p.player_id in alive
            players_view.append(row)

        my_role = roles.get(me.player_id) if me else None
        mafia_peers: list[dict[str, str]] = []
        if me and my_role in MAFIA_TEAM:
            mafia_peers = [
                {
                    "player_id": pid,
                    "display_name": state.player_by_id(pid).display_name
                    if state.player_by_id(pid)
                    else pid,
                }
                for pid, r in roles.items()
                if r in MAFIA_TEAM and pid != me.player_id
            ]

        # pass device card
        pass_device = None
        if state.play_mode == PlayMode.MODERATOR and state.phase == ROLE_REVEAL and is_host:
            idx = int(state.payload.get("reveal_index", 0))
            while idx < len(state.players) and state.players[idx].is_bot:
                idx += 1
            if idx < len(state.players):
                target = state.players[idx]
                r = roles.get(target.player_id, ROLE_CITIZEN)
                pass_device = {
                    "player_id": target.player_id,
                    "display_name": target.display_name,
                    "role": r,
                    "role_label": ROLE_LABELS_KO.get(r, r),
                    "index": idx,
                    "total": len(state.players),
                    "mafia_peers": [
                        {
                            "player_id": pid,
                            "display_name": state.player_by_id(pid).display_name
                            if state.player_by_id(pid)
                            else pid,
                        }
                        for pid, rr in roles.items()
                        if rr in MAFIA_TEAM and pid != target.player_id
                    ]
                    if r in MAFIA_TEAM
                    else [],
                }

        night_needed_all: list[str] = []
        if state.phase == NIGHT:
            have = set(state.payload.get("night_actions") or {})
            for key in self._night_actors_needed(state):
                if key not in have:
                    night_needed_all.append(key)

        night_needed: list[str] = []
        if is_host and state.play_mode == PlayMode.MODERATOR:
            night_needed = night_needed_all
        elif me and my_role:
            for key in night_needed_all:
                if key == "mafia_kill" and my_role == ROLE_MAFIA:
                    night_needed.append(key)
                elif key == f"doctor:{me.player_id}" and my_role == ROLE_DOCTOR:
                    night_needed.append(key)
                elif key == f"police:{me.player_id}" and my_role == ROLE_POLICE:
                    night_needed.append(key)
                elif key == f"spy:{me.player_id}" and my_role == ROLE_SPY:
                    night_needed.append(key)
                elif key == f"vigilante:{me.player_id}" and my_role == ROLE_VIGILANTE:
                    night_needed.append(key)

        investigate = None
        if me and state.phase in (NIGHT_RESULT, DAY_DISCUSSION, VOTE, REVOTE, EXECUTION):
            inv = (state.payload.get("last_night") or {}).get("investigate") or {}
            investigate = inv.get(me.player_id)

        # Moderator: all investigate results to whisper / pass-phone show
        moderator_investigates: list[dict[str, Any]] = []
        if (
            is_host
            and state.play_mode == PlayMode.MODERATOR
            and state.phase in (NIGHT_RESULT, DAY_DISCUSSION)
        ):
            inv_map = (state.payload.get("last_night") or {}).get("investigate") or {}
            for inv_id, result in inv_map.items():
                inv_p = state.player_by_id(inv_id)
                tgt = state.player_by_id(result.get("target_player_id") or "")
                inv_role = roles.get(inv_id, ROLE_CITIZEN)
                row: dict[str, Any] = {
                    "investigator_id": inv_id,
                    "investigator_name": inv_p.display_name if inv_p else inv_id,
                    "investigator_role": inv_role,
                    "investigator_role_label": ROLE_LABELS_KO.get(inv_role, inv_role),
                    "type": result.get("type"),
                    "target_player_id": result.get("target_player_id"),
                    "target_name": tgt.display_name if tgt else result.get("target_player_id"),
                }
                if result.get("type") == "police":
                    row["is_mafia_side"] = bool(result.get("is_mafia_side"))
                    row["result_text"] = (
                        "마피아 진영" if result.get("is_mafia_side") else "마피아 진영 아님"
                    )
                else:
                    row["has_special_role"] = bool(result.get("has_special_role"))
                    row["result_text"] = (
                        "특수직업 있음" if result.get("has_special_role") else "특수직업 없음"
                    )
                moderator_investigates.append(row)

        # ended: full role reveal for everyone; moderator host always sees roles
        roles_public = None
        if state.phase in (ROUND_SCORE, ENDED) or state.ended:
            roles_public = {
                pid: {"role": r, "role_label": ROLE_LABELS_KO.get(r, r)}
                for pid, r in roles.items()
            }

        moderator_roles = None
        if is_host and state.play_mode == PlayMode.MODERATOR:
            moderator_roles = {
                pid: {"role": r, "role_label": ROLE_LABELS_KO.get(r, r)}
                for pid, r in roles.items()
            }

        return {
            "game_id": state.game_id,
            "game_type": state.game_type,
            "room_id": state.room_id,
            "host_user_id": state.host_user_id,
            "play_mode": state.play_mode.value,
            "phase": state.phase,
            "total_rounds": state.total_rounds,
            "current_round": state.current_round,
            "phase_started_at": state.phase_started_at,
            "phase_duration_seconds": state.phase_duration_seconds,
            "ended": state.ended,
            "winner_player_id": state.winner_player_id,
            "winner_tiebreak": state.payload.get("winner_tiebreak"),
            "players": players_view,
            "is_host": is_host,
            "my_player_id": me.player_id if me else None,
            "my_role": my_role,
            "my_role_label": ROLE_LABELS_KO.get(my_role, my_role) if my_role else None,
            "mafia_peers": mafia_peers,
            "alive_player_ids": alive,
            "pass_device": pass_device,
            "night_needed": night_needed,
            "night_actions_count": len(state.payload.get("night_actions") or {}),
            "last_night": {
                "deaths": (state.payload.get("last_night") or {}).get("deaths") or [],
                "public_log": (state.payload.get("last_night") or {}).get("public_log") or [],
            }
            if state.phase
            in (NIGHT_RESULT, DAY_DISCUSSION, VOTE, REVOTE, EXECUTION, ROUND_SCORE, ENDED)
            else None,
            "my_investigate": investigate,
            "moderator_investigates": moderator_investigates,
            "day": {
                "votes_cast": len((state.payload.get("day") or {}).get("votes") or {}),
                "my_vote": ((state.payload.get("day") or {}).get("votes") or {}).get(me.player_id)
                if me
                else None,
                "accused": (state.payload.get("day") or {}).get("accused")
                if state.phase in (EXECUTION, ROUND_SCORE, ENDED)
                else None,
                "execution_deaths": (state.payload.get("day") or {}).get("execution_deaths")
                if state.phase in (EXECUTION, ROUND_SCORE, ENDED)
                else None,
                "revote": bool((state.payload.get("day") or {}).get("revote")),
            },
            "round_winner": state.payload.get("round_winner")
            if state.phase in (ROUND_SCORE, ENDED)
            else None,
            "round_delta": state.payload.get("round_delta")
            if state.phase in (ROUND_SCORE, ENDED)
            else None,
            "roles_public": roles_public,
            "moderator_roles": moderator_roles,
            "revealed_roles": {
                pid: {"role": r, "role_label": ROLE_LABELS_KO.get(r, r)}
                for pid, r in (state.payload.get("revealed_roles") or {}).items()
            },
            "role_reveal_on_death": reveal_on,
            "discussion_seconds": state.payload.get("discussion_seconds"),
            "discussion_expired": bool(state.payload.get("discussion_expired")),
            "turn_index": state.payload.get("turn_index"),
            "night_index": state.payload.get("night_index"),
        }
