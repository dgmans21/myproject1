TOP_TRUST_RANK_LIMIT = 10


def get_trust_rank_index(sb) -> dict[str, dict]:
    """user_id → { rank, display_name } (상위 N명)"""
    result = (
        sb.table("profiles")
        .select("id, display_name, trust_score")
        .order("trust_score", desc=True)
        .order("display_name")
        .limit(TOP_TRUST_RANK_LIMIT)
        .execute()
    )
    index: dict[str, dict] = {}
    for i, row in enumerate(result.data, start=1):
        index[row["id"]] = {"rank": i, "display_name": row["display_name"]}
    return index


def get_top_ranker_endorsements_for_places(sb, place_ids: list[str]) -> dict[str, dict]:
    """place_id → { rank, user_id, display_name } — 5점 준 top N 중 최고 순위 1명"""
    if not place_ids:
        return {}
    rank_index = get_trust_rank_index(sb)
    if not rank_index:
        return {}

    ratings = (
        sb.table("place_ratings")
        .select("place_id, user_id, rating")
        .in_("place_id", place_ids)
        .eq("rating", 5)
        .in_("user_id", list(rank_index.keys()))
        .execute()
    )

    best: dict[str, dict] = {}
    for row in ratings.data:
        pid = row["place_id"]
        uid = row["user_id"]
        info = rank_index[uid]
        current = best.get(pid)
        if not current or info["rank"] < current["rank"]:
            best[pid] = {
                "rank": info["rank"],
                "user_id": uid,
                "display_name": info["display_name"],
            }
    return best
