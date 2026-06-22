TITLE_SCORE_MAP = [
    (2000, "최고의 미식왕"),
    (1500, "전설의 미식왕 그랜드마스터"),
    (1000, "마스터 한국의 미식家"),
    (700, "다이아 방구석쓰리스타"),
    (500, "밥슐령가이드"),
    (300, "밥구르망"),
    (150, "gourmet 큐레이터"),
    (50, "미식 가이드"),
    (10, "맛집 발굴단"),
    (0, "신입 탐험가"),
]

BADGE_TIER_THRESHOLDS = [
    (2000, "SUPREME"),
    (1500, "GRANDMASTER"),
    (1000, "MASTER"),
    (700, "DIAMOND"),
    (500, "EMERALD"),
    (300, "PLATINUM"),
    (150, "GOLD"),
    (50, "SILVER"),
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
