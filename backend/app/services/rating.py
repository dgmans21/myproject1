from datetime import datetime

MAX_FIVE_STAR_PER_MONTH = 5
TIER_THRESHOLDS = {
    "bronze": (0, 3.5),
    "silver": (3.5, 4.0),
    "gold": (4.0, 4.5),
    "platinum": (4.5, 5.1),
}


def calc_tier(avg_rating: float, rating_count: int) -> str:
    if rating_count < 3:
        return "bronze"
    for tier, (low, high) in TIER_THRESHOLDS.items():
        if low <= avg_rating < high:
            return tier
    return "bronze"


def current_month_year() -> str:
    return datetime.now().strftime("%Y-%m")


def is_five_star_rating(rating: float) -> bool:
    return rating == 5


def is_quota_exempt_rating(rating: float) -> bool:
    """4.5점은 횟수 제약 없음."""
    return rating == 4.5
