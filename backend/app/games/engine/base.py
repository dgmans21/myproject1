"""Shared game engine primitives (Liar now, Mafia later)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


class PlayMode(str, Enum):
    MODERATOR = "moderator"
    REMOTE = "remote"


@dataclass
class Player:
    player_id: str
    display_name: str
    user_id: str | None = None
    score: int = 0
    is_bot: bool = False

    def to_public(self) -> dict[str, Any]:
        return {
            "player_id": self.player_id,
            "display_name": self.display_name,
            "user_id": self.user_id,
            "score": self.score,
            "is_bot": self.is_bot,
        }


@dataclass
class GameState:
    """In-memory game state. `payload` holds game-specific fields."""

    game_id: str
    game_type: str
    room_id: str
    host_user_id: str
    play_mode: PlayMode
    phase: str
    players: list[Player]
    total_rounds: int
    current_round: int = 1
    phase_started_at: str = field(default_factory=utc_now_iso)
    phase_duration_seconds: int | None = None
    ended: bool = False
    winner_player_id: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def new_id() -> str:
        return str(uuid4())

    def player_by_id(self, player_id: str) -> Player | None:
        for p in self.players:
            if p.player_id == player_id:
                return p
        return None

    def player_by_user_id(self, user_id: str) -> Player | None:
        for p in self.players:
            if p.user_id == user_id:
                return p
        return None

    def set_phase(self, phase: str, duration_seconds: int | None = None) -> None:
        self.phase = phase
        self.phase_started_at = utc_now_iso()
        self.phase_duration_seconds = duration_seconds

    def public_players(self) -> list[dict[str, Any]]:
        return [p.to_public() for p in self.players]


class GameEngine(ABC):
    """One concrete engine per game type (liar, mafia, …)."""

    game_type: str

    @abstractmethod
    def create(self, *, room_id: str, host_user_id: str, config: dict[str, Any]) -> GameState:
        ...

    @abstractmethod
    def apply_action(
        self,
        state: GameState,
        *,
        actor_user_id: str,
        action: str,
        data: dict[str, Any] | None = None,
    ) -> GameState:
        ...

    @abstractmethod
    def project(self, state: GameState, viewer_user_id: str) -> dict[str, Any]:
        """Mask secrets for a connected viewer."""

    @abstractmethod
    def tick(self, state: GameState) -> GameState | None:
        """Optional timer-driven transition. Return new state or None if unchanged."""
