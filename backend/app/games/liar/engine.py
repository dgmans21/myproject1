"""Liar game engine — prototype (Mafia-ready shared infra)."""

from __future__ import annotations

import random
from typing import Any

from fastapi import HTTPException

from app.games.engine.base import GameEngine, GameState, PlayMode, Player, utc_now
from app.games.liar.words import get_category, load_all_categories, pick_decoy_word

# Phases
WAITING = "WAITING"
ROLE_REVEAL = "ROLE_REVEAL"
DISCUSSION = "DISCUSSION"
VOTE = "VOTE"
REVEAL = "REVEAL"
GUESS = "GUESS"
ROUND_SCORE = "ROUND_SCORE"
ENDED = "ENDED"

MIN_PLAYERS = 3
MAX_PLAYERS = 12

# Legacy alias: fake_category → fake_word (same topic, wrong word)
_LIAR_MODE_ALIASES = {"fake_category": "fake_word"}


def _normalize_liar_mode(raw: str | None) -> str:
    mode = (raw or "category_only").strip()
    return _LIAR_MODE_ALIASES.get(mode, mode)

SCORE_ARREST_OK_CITIZEN = 100
SCORE_ARREST_OK_LIAR = -50
SCORE_ARREST_FAIL_CITIZEN = 0
SCORE_ARREST_FAIL_LIAR = 100
SCORE_GUESS_OK_CITIZEN = -50
SCORE_GUESS_OK_LIAR = 200
SCORE_GUESS_FAIL_CITIZEN = 50
SCORE_GUESS_FAIL_LIAR = -50


class LiarEngine(GameEngine):
    game_type = "liar"

    def create(self, *, room_id: str, host_user_id: str, config: dict[str, Any]) -> GameState:
        play_mode = PlayMode(config.get("play_mode", "moderator"))
        total_rounds = int(config.get("total_rounds", 3))
        if total_rounds < 1 or total_rounds > 20:
            raise HTTPException(status_code=400, detail="라운드 수는 1~20이어야 합니다")

        topic_policy = config.get("topic_policy", "fixed")
        if topic_policy not in ("fixed", "random_each_round"):
            raise HTTPException(
                status_code=400,
                detail="topic_policy는 fixed(고정) 또는 random_each_round(매판 랜덤)만 가능합니다",
            )

        category_id = config.get("category_id")
        if topic_policy == "fixed":
            if not category_id:
                raise HTTPException(status_code=400, detail="카테고리를 선택하세요")
            try:
                pack = get_category(str(category_id))
            except KeyError:
                raise HTTPException(status_code=400, detail="알 수 없는 카테고리입니다")
        else:
            packs = list(load_all_categories().values())
            if not packs:
                raise HTTPException(status_code=400, detail="카테고리 데이터가 없습니다")
            # optional seed category, else random
            if category_id:
                try:
                    pack = get_category(str(category_id))
                except KeyError:
                    pack = random.choice(packs)
            else:
                pack = random.choice(packs)

        discussion_seconds = int(config.get("discussion_seconds", 120))
        if discussion_seconds < 10 or discussion_seconds > 600:
            raise HTTPException(status_code=400, detail="토론 시간은 10~600초입니다")

        liar_mode = _normalize_liar_mode(config.get("liar_mode", "category_only"))
        if liar_mode not in ("category_only", "fake_word"):
            raise HTTPException(
                status_code=400,
                detail="liar_mode는 category_only(일반) 또는 fake_word(가짜 정답)만 가능합니다",
            )
        if liar_mode == "fake_word":
            if not any(len(p.words) >= 2 for p in load_all_categories().values()):
                raise HTTPException(
                    status_code=400,
                    detail="가짜 정답 모드는 단어가 2개 이상인 카테고리가 필요합니다",
                )
            if topic_policy == "fixed" and len(pack.words) < 2:
                raise HTTPException(
                    status_code=400,
                    detail=f"「{pack.name}」은 단어가 부족합니다. 다른 주제를 고르거나 매판 랜덤을 쓰세요",
                )
        if topic_policy == "random_each_round" and len(load_all_categories()) < 1:
            raise HTTPException(status_code=400, detail="카테고리 데이터가 없습니다")

        players = self._build_players(play_mode, host_user_id, config)
        if len(players) < MIN_PLAYERS:
            raise HTTPException(status_code=400, detail=f"최소 {MIN_PLAYERS}명이 필요합니다")
        if len(players) > MAX_PLAYERS:
            raise HTTPException(status_code=400, detail=f"최대 {MAX_PLAYERS}명까지입니다")

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
            phase_duration_seconds=None,
            payload={
                "category_id": pack.id,
                "category_name": pack.name,
                "topic_policy": topic_policy,
                "liar_mode": liar_mode,
                "discussion_seconds": discussion_seconds,
                "used_words": [],  # entries: "category_id::word"
                "round": {},
            },
        )
        self._start_round(state)
        return state

    def _build_players(
        self, play_mode: PlayMode, host_user_id: str, config: dict[str, Any]
    ) -> list[Player]:
        if play_mode == PlayMode.MODERATOR:
            names = config.get("player_names") or []
            if not isinstance(names, list) or not names:
                raise HTTPException(status_code=400, detail="플레이어 이름을 입력하세요")
            players: list[Player] = []
            for i, raw in enumerate(names, start=1):
                name = str(raw).strip() or f"플레이어{i}"
                # Host may play: first matching optional host_player_index
                user_id = host_user_id if config.get("host_player_index") == i - 1 else None
                # Default: host is also player 0 if host_joins
                players.append(
                    Player(player_id=f"p{i}", display_name=name[:20], user_id=user_id)
                )
            if config.get("host_joins", True):
                # Ensure host is linked to first player if none linked
                if not any(p.user_id == host_user_id for p in players):
                    players[0].user_id = host_user_id
            return players

        # remote
        user_ids = config.get("player_user_ids") or []
        names_map = config.get("player_display_names") or {}
        if not isinstance(user_ids, list) or not user_ids:
            raise HTTPException(status_code=400, detail="참가할 멤버를 선택하세요")
        if host_user_id not in user_ids:
            user_ids = [host_user_id, *user_ids]
        # dedupe
        seen: set[str] = set()
        ordered: list[str] = []
        for uid in user_ids:
            uid = str(uid)
            if uid not in seen:
                seen.add(uid)
                ordered.append(uid)
        players = []
        for i, uid in enumerate(ordered, start=1):
            label = str(names_map.get(uid) or f"플레이어{i}")[:20]
            players.append(Player(player_id=uid, display_name=label, user_id=uid))
        return players

    def _start_round(self, state: GameState) -> None:
        topic_policy = state.payload.get("topic_policy") or "fixed"
        prev_id = state.payload.get("category_id")

        if topic_policy == "random_each_round":
            packs = list(load_all_categories().values())
            if len(packs) > 1 and prev_id:
                candidates = [p for p in packs if p.id != prev_id]
                pack = random.choice(candidates or packs)
            else:
                pack = random.choice(packs)
        else:
            pack = get_category(state.payload["category_id"])

        state.payload["category_id"] = pack.id
        state.payload["category_name"] = pack.name

        used: list[str] = list(state.payload.get("used_words") or [])
        used_set = set(used)

        def key(cat_id: str, w: str) -> str:
            return f"{cat_id}::{w}"

        pool = [w for w in pack.words if key(pack.id, w) not in used_set]
        if not pool:
            # clear only this category's used entries, then retry
            used = [u for u in used if not u.startswith(f"{pack.id}::")]
            used_set = set(used)
            pool = list(pack.words)
        word = random.choice(pool)
        used.append(key(pack.id, word))

        liar = random.choice(state.players)
        round_data: dict[str, Any] = {
            "word": word,
            "liar_player_id": liar.player_id,
            "reveal_index": 0,
            "votes": {},
            "accused_player_id": None,
            "arrest_success": None,
            "guess_correct": None,
            "round_delta": {},
            "revealed_player_ids": [],
            "decoy_word": None,
        }
        if _normalize_liar_mode(state.payload.get("liar_mode")) == "fake_word":
            if len(pack.words) < 2:
                # random_each_round fallback: try another category with 2+ words
                alt = [p for p in load_all_categories().values() if len(p.words) >= 2]
                if not alt:
                    raise HTTPException(
                        status_code=400,
                        detail="가짜 정답 모드에 쓸 단어 풀이 부족합니다",
                    )
                pack = random.choice(alt)
                state.payload["category_id"] = pack.id
                state.payload["category_name"] = pack.name
                pool2 = [w for w in pack.words if key(pack.id, w) not in set(used)]
                word = random.choice(pool2 or list(pack.words))
                used = [u for u in used if not u.startswith(f"{pack.id}::")]
                used.append(key(pack.id, word))
                round_data["word"] = word
            decoy = pick_decoy_word(pack, word, used_keys=set(used))
            round_data["decoy_word"] = decoy
            used.append(key(pack.id, decoy))
        state.payload["used_words"] = used
        state.payload["round"] = round_data
        state.set_phase(ROLE_REVEAL)

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
            "end_discussion": self._act_end_discussion,
            "cast_vote": self._act_cast_vote,
            "moderator_accuse": self._act_moderator_accuse,
            "moderator_arrest_fail": self._act_moderator_arrest_fail,
            "submit_guess": self._act_submit_guess,
            "moderator_guess": self._act_moderator_guess,
            "ack_round_score": self._act_ack_round_score,
        }
        fn = handlers.get(action)
        if not fn:
            raise HTTPException(status_code=400, detail=f"알 수 없는 액션: {action}")
        return fn(state, actor_user_id=actor_user_id, is_host=is_host, data=data)

    def _require_phase(self, state: GameState, *phases: str) -> None:
        if state.phase not in phases:
            raise HTTPException(status_code=400, detail=f"현재 단계({state.phase})에서 불가합니다")

    def _act_advance_reveal(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require_phase(state, ROLE_REVEAL)
        if state.play_mode != PlayMode.MODERATOR or not is_host:
            raise HTTPException(status_code=403, detail="사회자만 역할 공개를 진행할 수 있습니다")
        rnd = state.payload["round"]
        idx = int(rnd.get("reveal_index", 0))
        revealed = list(rnd.get("revealed_player_ids") or [])
        if idx < len(state.players):
            pid = state.players[idx].player_id
            if pid not in revealed:
                revealed.append(pid)
            rnd["revealed_player_ids"] = revealed
            rnd["reveal_index"] = idx + 1
        return state

    def _act_finish_reveal(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require_phase(state, ROLE_REVEAL)
        if not is_host:
            raise HTTPException(status_code=403, detail="방장만 토론을 시작할 수 있습니다")
        # remote: allow anytime; moderator: prefer all revealed but allow skip for prototype
        secs = int(state.payload.get("discussion_seconds") or 120)
        state.set_phase(DISCUSSION, duration_seconds=secs)
        return state

    def _act_end_discussion(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require_phase(state, DISCUSSION)
        if not is_host:
            raise HTTPException(status_code=403, detail="방장만 토론을 종료할 수 있습니다")
        state.set_phase(VOTE)
        return state

    def _act_cast_vote(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require_phase(state, VOTE)
        if state.play_mode != PlayMode.REMOTE:
            raise HTTPException(status_code=400, detail="원격 모드에서만 개별 투표합니다")
        voter = state.player_by_user_id(actor_user_id)
        if not voter:
            raise HTTPException(status_code=403, detail="참가자가 아닙니다")
        target = str(data.get("target_player_id") or "")
        if not state.player_by_id(target):
            raise HTTPException(status_code=400, detail="잘못된 투표 대상입니다")
        if target == voter.player_id:
            raise HTTPException(status_code=400, detail="자기 자신은 투표할 수 없습니다")
        rnd = state.payload["round"]
        votes: dict[str, str] = dict(rnd.get("votes") or {})
        votes[voter.player_id] = target
        rnd["votes"] = votes
        # all voted?
        if len(votes) >= len(state.players):
            self._resolve_votes(state)
        return state

    def _act_moderator_accuse(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require_phase(state, VOTE)
        if state.play_mode != PlayMode.MODERATOR or not is_host:
            raise HTTPException(status_code=403, detail="사회자만 지목할 수 있습니다")
        target = str(data.get("target_player_id") or "")
        if not state.player_by_id(target):
            raise HTTPException(status_code=400, detail="잘못된 지목입니다")
        rnd = state.payload["round"]
        rnd["accused_player_id"] = target
        liar_id = rnd["liar_player_id"]
        success = target == liar_id
        rnd["arrest_success"] = success
        state.set_phase(REVEAL)
        return state

    def _act_moderator_arrest_fail(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        """동률/포기 → 검거실패."""
        self._require_phase(state, VOTE)
        if state.play_mode != PlayMode.MODERATOR or not is_host:
            raise HTTPException(status_code=403, detail="사회자만 가능합니다")
        rnd = state.payload["round"]
        rnd["accused_player_id"] = None
        rnd["arrest_success"] = False
        state.set_phase(REVEAL)
        return state

    def _resolve_votes(self, state: GameState) -> None:
        rnd = state.payload["round"]
        votes: dict[str, str] = dict(rnd.get("votes") or {})
        tallies: dict[str, int] = {}
        for target in votes.values():
            tallies[target] = tallies.get(target, 0) + 1
        if not tallies:
            rnd["accused_player_id"] = None
            rnd["arrest_success"] = False
            state.set_phase(REVEAL)
            return
        max_v = max(tallies.values())
        leaders = [pid for pid, c in tallies.items() if c == max_v]
        if len(leaders) != 1:
            # tie → arrest fail (LiarVotePolicy)
            rnd["accused_player_id"] = None
            rnd["arrest_success"] = False
        else:
            accused = leaders[0]
            rnd["accused_player_id"] = accused
            rnd["arrest_success"] = accused == rnd["liar_player_id"]
        state.set_phase(REVEAL)

    def _act_submit_guess(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require_phase(state, GUESS)
        if state.play_mode != PlayMode.REMOTE:
            raise HTTPException(status_code=400, detail="원격 모드 전용입니다")
        liar_id = state.payload["round"]["liar_player_id"]
        liar = state.player_by_id(liar_id)
        if not liar or liar.user_id != actor_user_id:
            raise HTTPException(status_code=403, detail="라이어만 정답을 제출할 수 있습니다")
        guess = str(data.get("guess") or "").strip()
        word = state.payload["round"]["word"]
        correct = self._normalize(guess) == self._normalize(word)
        state.payload["round"]["guess_correct"] = correct
        self._apply_round_scores(state)
        state.set_phase(ROUND_SCORE)
        return state

    def _act_moderator_guess(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require_phase(state, GUESS)
        if state.play_mode != PlayMode.MODERATOR or not is_host:
            raise HTTPException(status_code=403, detail="사회자만 정답 결과를 입력할 수 있습니다")
        correct = bool(data.get("correct"))
        state.payload["round"]["guess_correct"] = correct
        self._apply_round_scores(state)
        state.set_phase(ROUND_SCORE)
        return state

    def _act_ack_round_score(
        self, state: GameState, *, actor_user_id: str, is_host: bool, data: dict[str, Any]
    ) -> GameState:
        self._require_phase(state, ROUND_SCORE, REVEAL)
        if not is_host:
            raise HTTPException(status_code=403, detail="방장만 다음으로 진행할 수 있습니다")

        # From REVEAL: host advances to GUESS or ROUND_SCORE
        if state.phase == REVEAL:
            rnd = state.payload["round"]
            if rnd.get("arrest_success") is True:
                state.set_phase(GUESS)
                return state
            # arrest fail → score without guess
            self._apply_round_scores(state)
            state.set_phase(ROUND_SCORE)
            return state

        # ROUND_SCORE → next round or end
        if state.current_round >= state.total_rounds:
            state.set_phase(ENDED)
            state.ended = True
            self._resolve_winner(state)
            return state
        state.current_round += 1
        self._start_round(state)
        return state

    @staticmethod
    def _normalize(text: str) -> str:
        return "".join(text.lower().split())

    def _apply_round_scores(self, state: GameState) -> None:
        rnd = state.payload["round"]
        if rnd.get("round_delta"):
            return  # already applied
        liar_id = rnd["liar_player_id"]
        success = bool(rnd.get("arrest_success"))
        delta: dict[str, int] = {}

        for p in state.players:
            is_liar = p.player_id == liar_id
            if success:
                delta[p.player_id] = SCORE_ARREST_OK_LIAR if is_liar else SCORE_ARREST_OK_CITIZEN
            else:
                delta[p.player_id] = SCORE_ARREST_FAIL_LIAR if is_liar else SCORE_ARREST_FAIL_CITIZEN

        if success and rnd.get("guess_correct") is not None:
            correct = bool(rnd["guess_correct"])
            for p in state.players:
                is_liar = p.player_id == liar_id
                if correct:
                    delta[p.player_id] = delta.get(p.player_id, 0) + (
                        SCORE_GUESS_OK_LIAR if is_liar else SCORE_GUESS_OK_CITIZEN
                    )
                else:
                    delta[p.player_id] = delta.get(p.player_id, 0) + (
                        SCORE_GUESS_FAIL_LIAR if is_liar else SCORE_GUESS_FAIL_CITIZEN
                    )

        for p in state.players:
            add = delta.get(p.player_id, 0)
            p.score += add
        rnd["round_delta"] = delta

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
        started = state.phase_started_at
        try:
            # fromisoformat handles +00:00
            from datetime import datetime

            t0 = datetime.fromisoformat(started)
        except Exception:
            return None
        elapsed = (utc_now() - t0).total_seconds()
        if elapsed < state.phase_duration_seconds:
            return None
        if state.phase == DISCUSSION:
            state.set_phase(VOTE)
            return state
        return None

    def project(self, state: GameState, viewer_user_id: str) -> dict[str, Any]:
        rnd = state.payload.get("round") or {}
        is_host = viewer_user_id == state.host_user_id
        me = state.player_by_user_id(viewer_user_id)

        base: dict[str, Any] = {
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
            "players": state.public_players(),
            "category_id": state.payload.get("category_id"),
            "category_name": state.payload.get("category_name"),
            "topic_policy": state.payload.get("topic_policy") or "fixed",
            "liar_mode": state.payload.get("liar_mode"),
            "discussion_seconds": state.payload.get("discussion_seconds"),
            "is_host": is_host,
            "my_player_id": me.player_id if me else None,
            "round": {
                "reveal_index": rnd.get("reveal_index", 0),
                "revealed_count": len(rnd.get("revealed_player_ids") or []),
                "player_count": len(state.players),
                "votes_cast": len(rnd.get("votes") or {}),
                "my_vote": (rnd.get("votes") or {}).get(me.player_id) if me else None,
                "accused_player_id": rnd.get("accused_player_id"),
                "arrest_success": rnd.get("arrest_success")
                if state.phase in (REVEAL, GUESS, ROUND_SCORE, ENDED)
                else None,
                "guess_correct": rnd.get("guess_correct")
                if state.phase in (ROUND_SCORE, ENDED)
                else None,
                "round_delta": rnd.get("round_delta")
                if state.phase in (ROUND_SCORE, ENDED)
                else None,
                "liar_player_id": rnd.get("liar_player_id")
                if state.phase in (REVEAL, GUESS, ROUND_SCORE, ENDED)
                else None,
                "word": rnd.get("word")
                if state.phase in (REVEAL, GUESS, ROUND_SCORE, ENDED)
                else None,
            },
            "role_card": None,
            "pass_device": None,
        }

        # Pass-device card for moderator during ROLE_REVEAL
        if state.play_mode == PlayMode.MODERATOR and state.phase == ROLE_REVEAL and is_host:
            idx = int(rnd.get("reveal_index", 0))
            if 0 <= idx < len(state.players):
                # showing card for players[idx] before advance? 
                # UX: after advance, index points to NEXT; card shown is previous.
                # Simpler: show card for current index; advance increments after hide.
                # We treat reveal_index as "currently showing this index" until advanced past.
                show_idx = idx
                # If just started, show_idx=0 means ready to show p1; host taps "보기" via advance which marks revealed.
                # Alternative: pass_device shows player at reveal_index if not yet past end.
                if show_idx < len(state.players):
                    target = state.players[show_idx]
                    base["pass_device"] = self._role_card_for(state, target.player_id)
                    base["pass_device"]["player_id"] = target.player_id
                    base["pass_device"]["display_name"] = target.display_name
                    base["pass_device"]["index"] = show_idx
                    base["pass_device"]["total"] = len(state.players)

        # Remote: own role card during ROLE_REVEAL / DISCUSSION (hide after vote starts? keep until reveal)
        if me and state.phase in (ROLE_REVEAL, DISCUSSION, VOTE):
            if state.phase != VOTE or state.play_mode == PlayMode.REMOTE:
                base["role_card"] = self._role_card_for(state, me.player_id)

        # During GUESS, remote liar may still need to know they're liar (already know)
        if me and state.phase == GUESS:
            base["role_card"] = self._role_card_for(state, me.player_id)
            base["i_am_liar"] = me.player_id == rnd.get("liar_player_id")

        return base

    def _role_card_for(self, state: GameState, player_id: str) -> dict[str, Any]:
        rnd = state.payload["round"]
        is_liar = player_id == rnd["liar_player_id"]
        liar_mode = state.payload.get("liar_mode") or "category_only"

        if is_liar and _normalize_liar_mode(liar_mode) == "fake_word":
            # Same topic, wrong word — looks like a normal citizen card
            return {
                "category_name": state.payload["category_name"],
                "is_liar": False,
                "word": rnd.get("decoy_word") or "",
                "is_decoy": True,
            }

        card: dict[str, Any] = {
            "category_name": state.payload["category_name"],
            "is_liar": is_liar,
        }
        if is_liar:
            # category_only: topic only — omit word key
            pass
        else:
            card["word"] = rnd["word"]
        return card
