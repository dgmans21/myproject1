"""Background 1s tick loop for phase timers."""

from __future__ import annotations

import asyncio
import logging

from app.games.engine.hub import hub
from app.games.engine.registry import ensure_registered, get_engine
from app.games.engine.store import store

logger = logging.getLogger(__name__)

_task: asyncio.Task | None = None


async def _loop() -> None:
    ensure_registered()
    while True:
        try:
            for state in store.all_active():
                try:
                    engine = get_engine(state.game_type)
                except KeyError:
                    continue
                updated = engine.tick(state)
                if updated is not None:
                    store.save(updated)
                    await hub.broadcast(updated, engine)
        except Exception:
            logger.exception("game tick error")
        await asyncio.sleep(1)


def start_tick_loop() -> None:
    global _task
    if _task is None or _task.done():
        _task = asyncio.create_task(_loop())
