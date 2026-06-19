from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import (
    PlaceCreate,
    PlaceRatingCreate,
    PlaceResponse,
    TravelTimeRequest,
    TravelTimeResponse,
)
from app.services.kakao import get_travel_time
from app.services.rating import (
    MAX_FIVE_STAR_PER_MONTH,
    calc_recommender_title,
    calc_tier,
    current_month_year,
)

router = APIRouter(prefix="/places", tags=["places"])


@router.get("", response_model=list[PlaceResponse])
async def list_places(
    group_id: UUID | None = None,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    query = sb.table("places").select("*, profiles(recommender_title)")
    if group_id:
        query = query.eq("group_id", str(group_id))
    result = query.order("avg_rating", desc=True).limit(50).execute()

    return [
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
            recommender_title=p.get("profiles", {}).get("recommender_title") if p.get("profiles") else None,
        )
        for p in result.data
    ]


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
            "group_id": str(body.group_id) if body.group_id else None,
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
):
    sb = get_supabase()

    month = current_month_year()
    used = 0
    if body.rating == 5:
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

    if body.rating == 5:
        sb.table("user_rating_quota").upsert(
            {"user_id": user_id, "month_year": month, "five_star_used": used + 1},
            on_conflict="user_id,month_year",
        ).execute()

    # Recalculate place avg
    ratings = sb.table("place_ratings").select("rating").eq("place_id", str(place_id)).execute()
    all_ratings = [r["rating"] for r in ratings.data]
    avg = sum(all_ratings) / len(all_ratings) if all_ratings else 0
    tier = calc_tier(avg, len(all_ratings))

    sb.table("places").update({
        "avg_rating": round(avg, 2),
        "rating_count": len(all_ratings),
        "tier": tier,
    }).eq("id", str(place_id)).execute()

    # Update recommender score
    place = sb.table("places").select("recommended_by").eq("id", str(place_id)).single().execute()
    if place.data and place.data["recommended_by"]:
        recommender_id = place.data["recommended_by"]
        profile = sb.table("profiles").select("recommender_score").eq("id", recommender_id).single().execute()
        new_score = (profile.data["recommender_score"] or 0) + body.rating
        new_title = calc_recommender_title(new_score)
        sb.table("profiles").update({
            "recommender_score": new_score,
            "recommender_title": new_title,
        }).eq("id", recommender_id).execute()

    return {"ok": True, "new_tier": tier, "avg_rating": round(avg, 2)}


@router.post("/travel-time", response_model=TravelTimeResponse)
async def estimate_travel_time(
    body: TravelTimeRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        return await get_travel_time(
            body.origin_lat, body.origin_lng, body.dest_lat, body.dest_lng
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"경로 조회 실패: {e}") from e
