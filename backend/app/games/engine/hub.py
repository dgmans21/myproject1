"""WebSocket hub: per-game connections + projected push."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import WebSocket

from app.games.engine.base import GameEngine, GameState
from app.games.engine.store import store

logger = logging.getLogger(__name__)


class GameHub:
    def __init__(self) -> None:
        # game_id -> {user_id -> WebSocket}
        self._conns: dict[str, dict[str, WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, game_id: str, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            bucket = self._conns.setdefault(game_id, {})
            old = bucket.get(user_id)
            bucket[user_id] = ws
        if old is not None:
            try:
                await old.close(code=4000)
            except Exception:
                pass

    async def disconnect(self, game_id: str, user_id: str, ws: WebSocket) -> None:
        async with self._lock:
            bucket = self._conns.get(game_id)
            if not bucket:
                return
            if bucket.get(user_id) is ws:
                del bucket[user_id]
            if not bucket:
                self._conns.pop(game_id, None)

    async def broadcast(self, state: GameState, engine: GameEngine) -> None:
        async with self._lock:
            bucket = dict(self._conns.get(state.game_id, {}))
        if not bucket:
            return
        dead: list[str] = []
        for user_id, ws in bucket.items():
            try:
                view = engine.project(state, user_id)
                await ws.send_json({"type": "state", "payload": view})
            except Exception as exc:
                logger.debug("broadcast fail %s: %s", user_id, exc)
                dead.append(user_id)
        if dead:
            async with self._lock:
                bucket2 = self._conns.get(state.game_id, {})
                for uid in dead:
                    bucket2.pop(uid, None)

    async def send_error(self, ws: WebSocket, message: str) -> None:
        try:
            await ws.send_json({"type": "error", "message": message})
        except Exception:
            pass


hub = GameHub()


async def push_room_game(room_id: str, engine: GameEngine) -> None:
    state = store.get_by_room(room_id)
    if state:
        await hub.broadcast(state, engine)


async def push_game(game_id: str, engine: GameEngine) -> None:
    state = store.get(game_id)
    if state:
        await hub.broadcast(state, engine)
