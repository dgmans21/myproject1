from datetime import datetime

MAX_FIVE_STAR_PER_MONTH = 5
TIER_THRESHOLDS = {
    "bronze": (0, 3.5),
    "silver": (3.5, 4.0),
    "gold": (4.0, 4.5),
    "platinum": (4.5, 5.1),
}

TITLE_SCORE_MAP = [
    (500, "전설의 미식家"),
    (300, "gourmet 큐레이터"),
    (150, "미식 가이드"),
    (50, "맛집 발굴단"),
    (0, "신입 탐험가"),
]


def calc_tier(avg_rating: float, rating_count: int) -> str:
    if rating_count < 3:
        return "bronze"
    for tier, (low, high) in TIER_THRESHOLDS.items():
        if low <= avg_rating < high:
            return tier
    return "bronze"


def calc_recommender_title(score: int) -> str:
    for threshold, title in TITLE_SCORE_MAP:
        if score >= threshold:
            return title
    return "신입 탐험가"


def current_month_year() -> str:
    return datetime.now().strftime("%Y-%m")
