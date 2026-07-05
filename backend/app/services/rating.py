from datetime import datetime

MAX_FIVE_STAR_TOTAL = 5
MAX_FOUR_HALF_STAR_PER_MONTH = 5

# avg_rating 하한(포함) → tier (프론트 place-tier.ts PLACE_TIER_MIN_AVG와 동일)
PLACE_TIER_BANDS: list[tuple[float, str]] = [
    (4.5, "vip_white_gold"),
    (4.25, "grandmaster_crimson_vermilion"),
    (4.0, "master_blue"),
    (3.75, "diamond_shiny"),
    (3.5, "emerald_shiny"),
    (3.0, "platinum_shiny"),
    (2.5, "gold"),
    (2.0, "silver"),
    (1.0, "bronze"),
]


def calc_tier(avg_rating: float, rating_count: int) -> str:
    if rating_count <= 0 or avg_rating < 1.0:
        return "unrated"
    for min_avg, tier in PLACE_TIER_BANDS:
        if avg_rating >= min_avg:
            return tier
    return "unrated"


def current_month_year() -> str:
    return datetime.now().strftime("%Y-%m")


def is_five_star_rating(rating: float) -> bool:
    return rating == 5


def is_four_half_star_rating(rating: float) -> bool:
    return rating == 4.5


def count_user_five_star_ratings(sb, user_id: str, exclude_place_id: str | None = None) -> int:
    query = (
        sb.table("place_ratings")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("rating", 5)
    )
    if exclude_place_id:
        query = query.neq("place_id", exclude_place_id)
    result = query.execute()
    return result.count or 0


def get_user_five_star_places(sb, user_id: str) -> list[dict]:
    result = (
        sb.table("place_ratings")
        .select("place_id, places(name)")
        .eq("user_id", user_id)
        .eq("rating", 5)
        .execute()
    )
    items = []
    for row in result.data:
        place = row.get("places") or {}
        items.append({
            "place_id": row["place_id"],
            "place_name": place.get("name") or "알 수 없는 장소",
        })
    return items


def get_four_half_quota_used(sb, user_id: str) -> int:
    month = current_month_year()
    quota = (
        sb.table("user_rating_quota")
        .select("four_half_star_used")
        .eq("user_id", user_id)
        .eq("month_year", month)
        .execute()
    )
    if not quota.data:
        return 0
    return quota.data[0].get("four_half_star_used") or 0


def get_user_rating_quota(sb, user_id: str) -> dict:
    five_places = get_user_five_star_places(sb, user_id)
    return {
        "five_star": {
            "used": len(five_places),
            "max": MAX_FIVE_STAR_TOTAL,
            "places": five_places,
        },
        "four_half": {
            "used": get_four_half_quota_used(sb, user_id),
            "max": MAX_FOUR_HALF_STAR_PER_MONTH,
            "month_year": current_month_year(),
        },
    }


def recalc_place_stats(sb, place_id: str) -> tuple[str, float]:
    ratings = sb.table("place_ratings").select("rating").eq("place_id", place_id).execute()
    all_ratings = [float(r["rating"]) for r in ratings.data]
    avg = sum(all_ratings) / len(all_ratings) if all_ratings else 0
    tier = calc_tier(avg, len(all_ratings))
    sb.table("places").update({
        "avg_rating": round(avg, 2),
        "rating_count": len(all_ratings),
        "tier": tier,
    }).eq("id", place_id).execute()
    return tier, round(avg, 2)
