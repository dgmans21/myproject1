"""Game type registry."""

from __future__ import annotations

from app.games.engine.base import GameEngine

_REGISTRY: dict[str, GameEngine] = {}


def register(engine: GameEngine) -> None:
    _REGISTRY[engine.game_type] = engine


def get_engine(game_type: str) -> GameEngine:
    engine = _REGISTRY.get(game_type)
    if not engine:
        raise KeyError(f"Unknown game type: {game_type}")
    return engine


def ensure_registered() -> None:
    """Import concrete engines so they register themselves."""
    if _REGISTRY:
        return
    from app.games.liar.engine import LiarEngine  # noqa: F401

    register(LiarEngine())
