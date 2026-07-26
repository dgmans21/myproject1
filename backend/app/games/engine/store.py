"""In-memory game state store (single-process)."""

from __future__ import annotations

import threading
from typing import Callable

from app.games.engine.base import GameState


class GameStateStore:
    def __init__(self) -> None:
        self._by_id: dict[str, GameState] = {}
        self._by_room: dict[str, str] = {}
        self._lock = threading.RLock()

    def get(self, game_id: str) -> GameState | None:
        with self._lock:
            return self._by_id.get(game_id)

    def get_by_room(self, room_id: str) -> GameState | None:
        with self._lock:
            gid = self._by_room.get(room_id)
            return self._by_id.get(gid) if gid else None

    def save(self, state: GameState) -> None:
        with self._lock:
            self._by_id[state.game_id] = state
            if not state.ended:
                self._by_room[state.room_id] = state.game_id
            elif self._by_room.get(state.room_id) == state.game_id:
                # keep ended game discoverable until replaced
                pass

    def end_and_clear_room(self, state: GameState) -> None:
        with self._lock:
            state.ended = True
            self._by_id[state.game_id] = state
            if self._by_room.get(state.room_id) == state.game_id:
                del self._by_room[state.room_id]

    def update(self, game_id: str, mutator: Callable[[GameState], None]) -> GameState | None:
        with self._lock:
            state = self._by_id.get(game_id)
            if not state:
                return None
            mutator(state)
            self._by_id[game_id] = state
            return state

    def all_active(self) -> list[GameState]:
        with self._lock:
            return [s for s in self._by_id.values() if not s.ended]


store = GameStateStore()
