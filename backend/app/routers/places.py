from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id, get_debug_unlimited_flag
from app.database import get_supabase
from app.models.schemas import (
    PlaceCreate,
    PlaceRatingCreate,
    PlaceRecommendationVoteCreate,
    PlaceResponse,
    TravelTimeRequest,
    TravelTimeResponse,
)
from app.services.kakao import get_travel_time
from app.services.rating import (
    MAX_FIVE_STAR_PER_MONTH,
    calc_tier,
    current_month_year,
    is_five_star_rating,
    is_quota_exempt_rating,
)

router = APIRouter(prefix="/places", tags=["places"])


def _past_travel_hint(sb, user_id: str, place_id: str) -> str | None:
    logs = (
        sb.table("user_travel_logs")
        .select("duration_minutes")
        .eq("user_id", user_id)
        .eq("place_id", place_id)
        .order("recorded_at", desc=True)
        .limit(1)
        .execute()
    )
    if not logs.data:
        return None
    mins = logs.data[0]["duration_minutes"]
    return f"지난 모임 기준 약 {mins}분 소요"


@router.get("", response_model=list[PlaceResponse])
async def list_places(
    room_id: UUID | None = None,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    query = sb.table("places").select("*, profiles(trust_score, selected_title_id)")
    if room_id:
        query = query.eq("room_id", str(room_id))
    result = query.order("avg_rating", desc=True).limit(50).execute()

    items = []
    for p in result.data:
        title = None
        prof = p.get("profiles")
        if prof and prof.get("selected_title_id"):
            t = (
                sb.table("recommender_titles")
                .select("title")
                .eq("id", prof["selected_title_id"])
                .single()
                .execute()
            )
            if t.data:
                title = t.data["title"]

        items.append(
            PlaceResponse(
                id=p["id"],
                name=p["name"],
                address=p["address"],
                lat=p["lat"],
                lng=p["lng"],
                category=p.get("category"),
                tier=p["tier"],
                avg_rating=float(p["avg_rating"]),
                rating_count=p["rating_count"],
                recommender_title=title,
                past_travel_hint=_past_travel_hint(sb, user_id, p["id"]),
            )
        )
    return items


@router.post("", response_model=PlaceResponse, status_code=201)
async def create_place(body: PlaceCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    result = (
        sb.table("places")
        .insert({
            "name": body.name,
            "address": body.address,
            "lat": body.lat,
            "lng": body.lng,
            "category": body.category,
            "kakao_place_id": body.kakao_place_id,
            "room_id": str(body.room_id) if body.room_id else None,
            "recommended_by": user_id,
        })
        .execute()
    )
    p = result.data[0]
    return PlaceResponse(**p, avg_rating=0, rating_count=0)


@router.post("/{place_id}/ratings", status_code=201)
async def rate_place(
    place_id: UUID,
    body: PlaceRatingCreate,
    user_id: str = Depends(get_current_user_id),
    unlimited: bool = Depends(get_debug_unlimited_flag),
):
    sb = get_supabase()

    if body.rating * 2 != int(body.rating * 2):
        raise HTTPException(status_code=400, detail="평점은 0.5 단위만 가능합니다")

    if is_five_star_rating(body.rating) and not unlimited:
        month = current_month_year()
        quota = (
            sb.table("user_rating_quota")
            .select("*")
            .eq("user_id", user_id)
            .eq("month_year", month)
            .execute()
        )
        used = quota.data[0]["five_star_used"] if quota.data else 0
        if used >= MAX_FIVE_STAR_PER_MONTH:
            raise HTTPException(
                status_code=400,
                detail=f"이번 달 5점 평가 한도({MAX_FIVE_STAR_PER_MONTH}회)를 초과했습니다",
            )

    sb.table("place_ratings").upsert(
        {
            "place_id": str(place_id),
            "user_id": user_id,
            "rating": body.rating,
            "review": body.review,
        },
        on_conflict="place_id,user_id",
    ).execute()

    if is_five_star_rating(body.rating) and not unlimited and not is_quota_exempt_rating(body.rating):
        month = current_month_year()
        quota = (
            sb.table("user_rating_quota")
            .select("*")
            .eq("user_id", user_id)
            .eq("month_year", month)
            .execute()
        )
        used = quota.data[0]["five_star_used"] if quota.data else 0
        sb.table("user_rating_quota").upsert(
            {"user_id": user_id, "month_year": month, "five_star_used": used + 1},
            on_conflict="user_id,month_year",
        ).execute()

    ratings = sb.table("place_ratings").select("rating").eq("place_id", str(place_id)).execute()
    all_ratings = [float(r["rating"]) for r in ratings.data]
    avg = sum(all_ratings) / len(all_ratings) if all_ratings else 0
    tier = calc_tier(avg, len(all_ratings))

    sb.table("places").update({
        "avg_rating": round(avg, 2),
        "rating_count": len(all_ratings),
        "tier": tier,
    }).eq("id", str(place_id)).execute()

    return {"ok": True, "new_tier": tier, "avg_rating": round(avg, 2)}


@router.post("/{place_id}/recommendation-votes", status_code=201)
async def vote_recommendation(
    place_id: UUID,
    body: PlaceRecommendationVoteCreate,
    user_id: str = Depends(get_current_user_id),
):
    """신뢰도: 추천 +1 / 비추천 -1 (DB 트리거로 profiles.trust_score 반영)"""
    sb = get_supabase()
    place = sb.table("places").select("recommended_by").eq("id", str(place_id)).single().execute()
    if place.data and place.data["recommended_by"] == user_id:
        raise HTTPException(status_code=400, detail="본인 추천 장소에는 투표할 수 없습니다")

    sb.table("place_recommendation_votes").upsert(
        {
            "place_id": str(place_id),
            "voter_id": user_id,
            "vote_type": body.vote_type.value,
        },
        on_conflict="place_id,voter_id",
    ).execute()
    return {"ok": True}


@router.post("/travel-time", response_model=TravelTimeResponse)
async def estimate_travel_time(
    body: TravelTimeRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        result = await get_travel_time(
            body.origin_lat, body.origin_lng, body.dest_lat, body.dest_lng
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"경로 조회 실패: {e}") from e

    if body.place_id:
        sb = get_supabase()
        sb.table("user_travel_logs").insert({
            "user_id": user_id,
            "place_id": str(body.place_id),
            "appointment_id": str(body.appointment_id) if body.appointment_id else None,
            "duration_minutes": result.duration_minutes,
            "distance_meters": result.distance_meters,
        }).execute()

    return result
