from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentStatus,
    DateVoteCreate,
    TimeSlotSummary,
    TimeVoteCreate,
    VoteSummary,
)
from app.routers.groups import _ensure_member

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("/group/{group_id}", response_model=list[AppointmentResponse])
async def list_group_appointments(group_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(group_id), user_id)
    result = (
        sb.table("appointments")
        .select("*")
        .eq("group_id", str(group_id))
        .order("created_at", desc=True)
        .execute()
    )
    return [AppointmentResponse(**a) for a in result.data]


@router.post("", response_model=AppointmentResponse, status_code=201)
async def create_appointment(body: AppointmentCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(body.group_id), user_id)
    result = (
        sb.table("appointments")
        .insert({
            "group_id": str(body.group_id),
            "title": body.title,
            "description": body.description,
            "status": AppointmentStatus.date_voting.value,
            "created_by": user_id,
        })
        .execute()
    )
    return AppointmentResponse(**result.data[0])


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["group_id"], user_id)
    return AppointmentResponse(**apt)


# --- Phase 1: Date voting ---
@router.post("/{appointment_id}/date-votes", status_code=201)
async def submit_date_vote(
    appointment_id: UUID,
    body: DateVoteCreate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["group_id"], user_id)
    if apt["status"] != AppointmentStatus.date_voting.value:
        raise HTTPException(status_code=400, detail="날짜 투표 단계가 아닙니다")

    sb.table("date_votes").upsert(
        {
            "appointment_id": str(appointment_id),
            "user_id": user_id,
            "vote_date": body.vote_date.isoformat(),
            "is_available": body.is_available,
        },
        on_conflict="appointment_id,user_id,vote_date",
    ).execute()
    return {"ok": True}


@router.get("/{appointment_id}/date-votes/summary", response_model=list[VoteSummary])
async def get_date_vote_summary(appointment_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["group_id"], user_id)

    members = sb.table("group_members").select("user_id").eq("group_id", apt["group_id"]).execute()
    total = len(members.data)

    votes = (
        sb.table("date_votes")
        .select("vote_date, is_available")
        .eq("appointment_id", str(appointment_id))
        .eq("is_available", True)
        .execute()
    )

    counts: dict[str, int] = defaultdict(int)
    for v in votes.data:
        counts[v["vote_date"]] += 1

    return [
        VoteSummary(
            vote_date=d,
            available_count=c,
            total_members=total,
            availability_rate=round(c / total * 100, 1) if total else 0,
        )
        for d, c in sorted(counts.items(), key=lambda x: (-x[1], x[0]))
    ]


@router.post("/{appointment_id}/advance-to-time-vote")
async def advance_to_time_vote(appointment_id: UUID, user_id: str = Depends(get_current_user_id)):
    """1차 투표 완료 → 2차 시간 투표로 전환"""
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    if apt["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="약속 생성자만 진행할 수 있습니다")
    if apt["status"] != AppointmentStatus.date_voting.value:
        raise HTTPException(status_code=400, detail="날짜 투표 단계가 아닙니다")

    sb.table("appointments").update({"status": AppointmentStatus.time_voting.value}).eq(
        "id", str(appointment_id)
    ).execute()
    return {"status": "time_voting"}


# --- Phase 2: Time voting ---
@router.post("/{appointment_id}/time-votes", status_code=201)
async def submit_time_vote(
    appointment_id: UUID,
    body: TimeVoteCreate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["group_id"], user_id)
    if apt["status"] != AppointmentStatus.time_voting.value:
        raise HTTPException(status_code=400, detail="시간 투표 단계가 아닙니다")

    sb.table("time_votes").upsert(
        {
            "appointment_id": str(appointment_id),
            "user_id": user_id,
            "vote_date": body.vote_date.isoformat(),
            "vote_time": body.vote_time.isoformat(),
            "priority": body.priority,
        },
        on_conflict="appointment_id,user_id,vote_date,vote_time",
    ).execute()
    return {"ok": True}


@router.get("/{appointment_id}/time-votes/summary", response_model=list[TimeSlotSummary])
async def get_time_vote_summary(appointment_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["group_id"], user_id)

    votes = (
        sb.table("time_votes")
        .select("vote_date, vote_time, priority")
        .eq("appointment_id", str(appointment_id))
        .execute()
    )

    slot_counts: dict[tuple, int] = defaultdict(int)
    slot_scores: dict[tuple, int] = defaultdict(int)
    for v in votes.data:
        key = (v["vote_date"], v["vote_time"])
        slot_counts[key] += 1
        slot_scores[key] += (4 - v["priority"])  # priority 1 = 3pts, 2 = 2pts, 3 = 1pt

    results = [
        TimeSlotSummary(
            vote_date=k[0],
            vote_time=k[1],
            vote_count=slot_counts[k],
            total_score=slot_scores[k],
        )
        for k in slot_counts
    ]
    return sorted(results, key=lambda x: (-x.total_score, -x.vote_count))


@router.post("/{appointment_id}/confirm")
async def confirm_appointment(
    appointment_id: UUID,
    vote_date: str,
    vote_time: str,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    if apt["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="약속 생성자만 확정할 수 있습니다")

    sb.table("appointments").update({
        "status": AppointmentStatus.confirmed.value,
        "confirmed_date": vote_date,
        "confirmed_time": vote_time,
    }).eq("id", str(appointment_id)).execute()
    return {"status": "confirmed", "date": vote_date, "time": vote_time}


def _get_appointment(sb, appointment_id: str) -> dict:
    result = sb.table("appointments").select("*").eq("id", appointment_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="약속을 찾을 수 없습니다")
    return result.data
