"""Game REST + WebSocket — Room-scoped, no imports from rooms.py services into game engines."""

from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from jose import JWTError
from pydantic import BaseModel, Field

from app.auth import decode_supabase_jwt, get_current_user_id
from app.database import get_supabase
from app.games.engine.hub import hub
from app.games.engine.registry import ensure_registered, get_engine
from app.games.engine.store import store
from app.games.liar.words import list_categories
from app.services.room_access import is_member

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rooms", tags=["games"])


def _ensure_member(sb, room_id: str, user_id: str) -> None:
    if not is_member(sb, room_id, user_id):
        raise HTTPException(status_code=403, detail="방 멤버만 이용할 수 있습니다")


def _ensure_owner(sb, room_id: str, user_id: str) -> None:
    result = (
        sb.table("room_members")
        .select("role")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data or result.data[0].get("role") != "OWNER":
        raise HTTPException(status_code=403, detail="방장만 가능합니다")


class LiarStartRequest(BaseModel):
    game_type: Literal["liar"] = "liar"
    play_mode: Literal["moderator", "remote"] = "moderator"
    total_rounds: int = Field(default=3, ge=1, le=20)
    category_id: str | None = None
    topic_policy: Literal["fixed", "random_each_round"] = "fixed"
    liar_mode: Literal["category_only", "fake_word", "fake_category"] = "category_only"
    discussion_seconds: int = Field(default=120, ge=10, le=600)
    player_names: list[str] | None = None
    host_joins: bool = True
    player_user_ids: list[str] | None = None
    player_display_names: dict[str, str] | None = None


class MafiaStartRequest(BaseModel):
    game_type: Literal["mafia"] = "mafia"
    play_mode: Literal["moderator", "remote"] = "moderator"
    total_rounds: int = Field(default=1, ge=1, le=10)
    discussion_seconds: int = Field(default=120, ge=10, le=600)
    role_reveal_on_death: bool = True
    bot_count: int = Field(default=0, ge=0, le=8)
    mafia_count: int = Field(default=1, ge=0, le=5)
    spy_count: int = Field(default=0, ge=0, le=3)
    doctor_count: int = Field(default=1, ge=0, le=2)
    police_count: int = Field(default=1, ge=0, le=2)
    vigilante_count: int = Field(default=0, ge=0, le=2)
    player_names: list[str] | None = None
    host_joins: bool = False
    player_user_ids: list[str] | None = None
    player_display_names: dict[str, str] | None = None


class GameStartRequest(BaseModel):
    game_type: Literal["liar", "mafia"] = "liar"
    play_mode: Literal["moderator", "remote"] = "moderator"
    total_rounds: int = 3
    discussion_seconds: int = 120
    # liar
    category_id: str | None = None
    topic_policy: Literal["fixed", "random_each_round"] | None = None
    liar_mode: Literal["category_only", "fake_word", "fake_category"] | None = None
    # mafia
    role_reveal_on_death: bool | None = None
    bot_count: int | None = None
    mafia_count: int | None = None
    spy_count: int | None = None
    doctor_count: int | None = None
    police_count: int | None = None
    vigilante_count: int | None = None
    # common
    player_names: list[str] | None = None
    host_joins: bool | None = None
    player_user_ids: list[str] | None = None
    player_display_names: dict[str, str] | None = None


class GameActionRequest(BaseModel):
    action: str
    data: dict[str, Any] | None = None


@router.get("/{room_id}/games/categories")
def get_liar_categories(room_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(room_id), user_id)
    ensure_registered()
    return {"categories": list_categories()}


@router.get("/{room_id}/games/active")
def get_active_game(room_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(room_id), user_id)
    ensure_registered()
    state = store.get_by_room(str(room_id))
    if not state:
        return {"game": None}
    engine = get_engine(state.game_type)
    return {"game": engine.project(state, user_id)}


@router.post("/{room_id}/games/start")
async def start_game(
    room_id: str,
    body: GameStartRequest,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_owner(sb, rid, user_id)
    ensure_registered()

    existing = store.get_by_room(rid)
    if existing and not existing.ended:
        raise HTTPException(status_code=409, detail="이미 진행 중인 게임이 있습니다")

    if body.play_mode == "remote" and body.player_user_ids:
        for uid in body.player_user_ids:
            if not is_member(sb, rid, uid):
                raise HTTPException(status_code=400, detail="참가자는 방 멤버여야 합니다")

    display_names = dict(body.player_display_names or {})
    if body.play_mode == "remote":
        uids = list(body.player_user_ids or [])
        if user_id not in uids:
            uids = [user_id, *uids]
        missing = [u for u in uids if u not in display_names]
        if missing:
            result = (
                sb.table("profiles")
                .select("id, display_name")
                .in_("id", missing)
                .execute()
            )
            for row in result.data or []:
                display_names[row["id"]] = row.get("display_name") or "플레이어"

    engine = get_engine(body.game_type)
    config = body.model_dump(exclude_none=True)
    config["player_display_names"] = display_names
    if body.game_type == "mafia" and body.host_joins is None:
        config["host_joins"] = False
    if body.game_type == "liar" and body.host_joins is None:
        config["host_joins"] = True
    state = engine.create(room_id=rid, host_user_id=user_id, config=config)
    store.save(state)
    await hub.broadcast(state, engine)
    return {"game": engine.project(state, user_id)}


@router.post("/{room_id}/games/{game_id}/action")
async def game_action(
    room_id: str,
    game_id: str,
    body: GameActionRequest,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    _ensure_member(sb, str(room_id), user_id)
    ensure_registered()
    state = store.get(str(game_id))
    if not state or state.room_id != str(room_id):
        raise HTTPException(status_code=404, detail="게임을 찾을 수 없습니다")
    engine = get_engine(state.game_type)
    try:
        new_state = engine.apply_action(
            state, actor_user_id=user_id, action=body.action, data=body.data
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("game action failed")
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if new_state.ended:
        store.end_and_clear_room(new_state)
    else:
        store.save(new_state)
    await hub.broadcast(new_state, engine)
    return {"game": engine.project(new_state, user_id)}


@router.delete("/{room_id}/games/{game_id}")
async def force_end_game(
    room_id: str,
    game_id: str,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)
    ensure_registered()
    state = store.get(str(game_id))
    if not state or state.room_id != str(room_id):
        raise HTTPException(status_code=404, detail="게임을 찾을 수 없습니다")
    engine = get_engine(state.game_type)
    new_state = engine.apply_action(state, actor_user_id=user_id, action="force_end")
    store.end_and_clear_room(new_state)
    await hub.broadcast(new_state, engine)
    return {"game": engine.project(new_state, user_id)}


@router.websocket("/{room_id}/games/{game_id}/ws")
async def game_ws(
    websocket: WebSocket,
    room_id: str,
    game_id: str,
    token: str | None = Query(default=None),
):
    ensure_registered()
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_supabase_jwt(token)
        user_id = str(payload.get("sub") or "")
        if not user_id:
            raise JWTError("no sub")
    except JWTError:
        await websocket.close(code=4401)
        return

    sb = get_supabase()
    if not is_member(sb, str(room_id), user_id):
        await websocket.close(code=4403)
        return

    state = store.get(str(game_id))
    if not state or state.room_id != str(room_id):
        await websocket.close(code=4404)
        return

    # moderator: only host needs WS; remote: players
    if state.play_mode.value == "moderator" and user_id != state.host_user_id:
        # allow spectators read-only? for prototype reject non-host
        await websocket.close(code=4403)
        return

    engine = get_engine(state.game_type)
    await hub.connect(str(game_id), user_id, websocket)
    try:
        await websocket.send_json({"type": "state", "payload": engine.project(state, user_id)})
        while True:
            msg = await websocket.receive_json()
            if not isinstance(msg, dict):
                continue
            mtype = msg.get("type")
            if mtype == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            if mtype == "action":
                action = str(msg.get("action") or "")
                data = msg.get("data") if isinstance(msg.get("data"), dict) else {}
                cur = store.get(str(game_id))
                if not cur:
                    await hub.send_error(websocket, "게임이 없습니다")
                    continue
                try:
                    new_state = engine.apply_action(
                        cur, actor_user_id=user_id, action=action, data=data
                    )
                except HTTPException as he:
                    await hub.send_error(websocket, str(he.detail))
                    continue
                except Exception as exc:
                    await hub.send_error(websocket, str(exc))
                    continue
                if new_state.ended:
                    store.end_and_clear_room(new_state)
                else:
                    store.save(new_state)
                await hub.broadcast(new_state, engine)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.disconnect(str(game_id), user_id, websocket)
