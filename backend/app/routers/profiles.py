from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id, get_debug_unlimited_flag
from app.database import get_supabase
from app.models.schemas import (
    AttendanceHeatmapDay,
    ProfileResponse,
    ProfileUpdate,
    RecommenderTitle,
    SecurityVerifyRequest,
)
from app.services.trust import calc_title_for_score

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _load_profile(sb, user_id: str) -> ProfileResponse:
    result = sb.table("profiles").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다")

    titles_result = sb.table("recommender_titles").select("*").order("min_score").execute()
    available = [RecommenderTitle(**t) for t in titles_result.data]

    data = result.data
    selected_title = None
    if data.get("selected_title_id"):
        match = next((t for t in available if t.id == data["selected_title_id"]), None)
        selected_title = match.title if match else calc_title_for_score(data.get("trust_score", 0))
    else:
        selected_title = calc_title_for_score(data.get("trust_score", 0))

    return ProfileResponse(
        **data,
        selected_title=selected_title,
        available_titles=[t for t in available if t.min_score <= (data.get("trust_score") or 0)],
    )


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    return _load_profile(sb, user_id)


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(
    body: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    update_data = body.model_dump(exclude_none=True)

    if "selected_title_id" in update_data:
        profile = sb.table("profiles").select("trust_score").eq("id", user_id).single().execute()
        title = (
            sb.table("recommender_titles")
            .select("min_score")
            .eq("id", update_data["selected_title_id"])
            .single()
            .execute()
        )
        if not title.data or title.data["min_score"] > (profile.data["trust_score"] or 0):
            raise HTTPException(status_code=400, detail="해당 칭호를 사용할 수 없습니다")

    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")

    sb.table("profiles").update(update_data).eq("id", user_id).execute()
    return _load_profile(sb, user_id)


@router.get("/me/attendance-heatmap", response_model=list[AttendanceHeatmapDay])
async def get_attendance_heatmap(
    days: int = 90,
    user_id: str = Depends(get_current_user_id),
):
    """약속 이행 잔디형 캘린더 데이터"""
    sb = get_supabase()
    result = (
        sb.table("appointment_attendance")
        .select("attended_on")
        .eq("user_id", user_id)
        .order("attended_on", desc=True)
        .limit(500)
        .execute()
    )

    counts: dict[str, int] = {}
    for row in result.data:
        d = row["attended_on"]
        counts[d] = counts.get(d, 0) + 1

    return [AttendanceHeatmapDay(date=d, count=c) for d, c in sorted(counts.items())]


@router.post("/me/verify-security")
async def verify_security(
    body: SecurityVerifyRequest,
    user_id: str = Depends(get_current_user_id),
):
    """중요 권한: PIN/비밀번호 일회성 해시 검증"""
    import hashlib

    sb = get_supabase()
    profile = sb.table("profiles").select("security_pin_hash").eq("id", user_id).single().execute()
    if not profile.data or not profile.data.get("security_pin_hash"):
        raise HTTPException(status_code=400, detail="보안 PIN이 설정되지 않았습니다")

    submitted = hashlib.sha256(body.pin_or_password.encode()).hexdigest()
    if submitted != profile.data["security_pin_hash"]:
        raise HTTPException(status_code=403, detail="인증에 실패했습니다")
    return {"verified": True}


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(profile_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    return _load_profile(sb, str(profile_id))
