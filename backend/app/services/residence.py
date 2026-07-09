import re

_RESIDENCE_METRO = re.compile(
    r"^(서울|부산|대구|인천|광주|대전|울산|세종|제주)"
    r"(?:특별시|광역시|특별자치시|특별자치도)?\s*([^\s]+(?:구|군))"
)
_RESIDENCE_PROVINCE = re.compile(r"^([가-힣]+도)\s+([^\s]+(?:시|군))")


def derive_residence_from_address(address: str) -> str:
    trimmed = (address or "").strip()
    if not trimmed:
        return ""

    metro = _RESIDENCE_METRO.match(trimmed)
    if metro:
        city = metro.group(1)
        if city == "세종":
            return f"세종 {metro.group(2)}"
        return f"{city} {metro.group(2)}"

    province = _RESIDENCE_PROVINCE.match(trimmed)
    if province:
        return f"{province.group(1)} {province.group(2)}"

    parts = trimmed.split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[1]}"
    return trimmed[:40]
