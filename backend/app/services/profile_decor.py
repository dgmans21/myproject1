"""profiles.profile_decor JSONB 검증 (001_schema CHECK와 동일)"""

THEME_PRESETS = frozenset({
    "default",
    "warm",
    "ocean",
    "forest",
    "sunset",
    "minimal",
    "lavender",
    "peach",
    "mint",
    "berry",
    "lemon",
    "sky",
})

MAX_INTEREST_EMOJIS = 24
MAX_STATUS_MESSAGE_LENGTH = 40


def normalize_status_message(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    return trimmed[:MAX_STATUS_MESSAGE_LENGTH]


def merge_profile_decor(existing: dict | None, patch: dict) -> dict:
    base = dict(existing or {})
    for key, value in patch.items():
        if value is None:
            base.pop(key, None)
        else:
            base[key] = value
    validate_profile_decor(base)
    return base


def validate_profile_decor(decor: dict) -> None:
    accent = decor.get("accent_color")
    if accent is not None and not (
        isinstance(accent, str) and len(accent) == 7 and accent.startswith("#")
    ):
        raise ValueError("accent_color는 #RRGGBB 형식이어야 합니다")

    theme = decor.get("theme_preset")
    if theme is not None and theme not in THEME_PRESETS:
        raise ValueError("theme_preset 값이 올바르지 않습니다")

    emojis = decor.get("interest_emojis")
    if emojis is not None:
        if not isinstance(emojis, list):
            raise ValueError("interest_emojis는 배열이어야 합니다")
        if len(emojis) > MAX_INTEREST_EMOJIS:
            raise ValueError(f"관심 이모지는 최대 {MAX_INTEREST_EMOJIS}개까지 가능합니다")
