TITLE_SCORE_MAP = [
    (100, "전설의 미식家"),
    (60, "gourmet 큐레이터"),
    (30, "미식 가이드"),
    (10, "맛집 발굴단"),
    (0, "신입 탐험가"),
]

BADGE_TIER_THRESHOLDS = [
    (100, "PLATINUM"),
    (60, "GOLD"),
    (30, "SILVER"),
    (10, "BRONZE"),
    (0, "NONE"),
]


def calc_title_for_score(score: int) -> str:
    for threshold, title in TITLE_SCORE_MAP:
        if score >= threshold:
            return title
    return "신입 탐험가"


def calc_badge_tier(score: int) -> str:
    for threshold, tier in BADGE_TIER_THRESHOLDS:
        if score >= threshold:
            return tier
    return "NONE"
