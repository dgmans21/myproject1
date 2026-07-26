"""Load curated liar category JSON files."""

from __future__ import annotations

import json
import random
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field

DATA_DIR = Path(__file__).resolve().parent / "data"


class CategoryPack(BaseModel):
    id: str
    name: str
    words: list[str] = Field(min_length=1)


@lru_cache(maxsize=1)
def load_all_categories() -> dict[str, CategoryPack]:
    packs: dict[str, CategoryPack] = {}
    if not DATA_DIR.is_dir():
        raise FileNotFoundError(f"Liar data dir missing: {DATA_DIR}")
    for path in sorted(DATA_DIR.glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        pack = CategoryPack.model_validate(raw)
        packs[pack.id] = pack
    if not packs:
        raise RuntimeError("No liar category JSON found")
    return packs


def list_categories() -> list[dict[str, str | int]]:
    return [
        {"id": p.id, "name": p.name, "word_count": len(p.words)}
        for p in load_all_categories().values()
    ]


def get_category(category_id: str) -> CategoryPack:
    packs = load_all_categories()
    if category_id not in packs:
        raise KeyError(category_id)
    return packs[category_id]


def pick_decoy_word(
    pack: CategoryPack,
    real_word: str,
    *,
    used_keys: set[str] | None = None,
) -> str:
    """Same category, different word (fake-answer mode). Prefer unused words."""
    used_keys = used_keys or set()

    def key(w: str) -> str:
        return f"{pack.id}::{w}"

    others = [w for w in pack.words if w != real_word]
    if not others:
        raise RuntimeError("Need at least 2 words in category for fake_word mode")
    fresh = [w for w in others if key(w) not in used_keys]
    return random.choice(fresh or others)


def pick_other_category(exclude_id: str) -> CategoryPack:
    """Legacy helper — prefer pick_decoy_word for fake_word mode."""
    packs = [p for p in load_all_categories().values() if p.id != exclude_id]
    if not packs:
        raise RuntimeError("Need at least 2 categories")
    return random.choice(packs)
