from collections import defaultdict
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id, get_debug_unlimited_flag
from app.database import get_supabase
from app.models.schemas import (
    AppointmentBriefingResponse,
    AppointmentCommentCreate,
    AppointmentCommentResponse,
    AppointmentCreate,
    AppointmentResponse,
    AppointmentStatus,
    DateVoteCreate,
    DepartureStatus,
    DepartureStatusUpdate,
    MeetingMemoryListItem,
    MeetingMemoryMemoItem,
    MeetingMemoryMemoUpsert,
    MeetingSettlement,
    TimeSlotSummary,
    TimeVoteCreate,
    VoteSummary,
)
from app.services.briefing import (
    build_briefing,
    post_comment,
    record_confirm_travel_logs,
    set_departure_status,
)
from app.routers.rooms import _ensure_member

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("/meeting-memories", response_model=list[MeetingMemoryListItem])
async def list_meeting_memories(user_id: str = Depends(get_current_user_id)):
    """확정된 약속 목록 + 내 메모 미리보기 (추억록)"""
    sb = get_supabase()
    memberships = (
        sb.table("room_members").select("room_id").eq("user_id", user_id).execute()
    )
    room_ids = [m["room_id"] for m in memberships.data or []]
    if not room_ids:
        return []

    apts = (
        sb.table("appointments")
        .select("*")
        .in_("room_id", room_ids)
        .eq("status", AppointmentStatus.confirmed.value)
        .not_.is_("confirmed_date", "null")
        .order("confirmed_date", desc=True)
        .order("confirmed_time", desc=True)
        .execute()
    )

    items: list[MeetingMemoryListItem] = []
    for apt in apts.data or []:
        room = (
            sb.table("rooms")
            .select("name, room_type")
            .eq("id", apt["room_id"])
            .single()
            .execute()
        )
        room_data = room.data or {}
        place_name = None
        place_id = apt.get("confirmed_place_id")
        if place_id:
            place = (
                sb.table("places")
                .select("name")
                .eq("id", str(place_id))
                .single()
                .execute()
            )
            if place.data:
                place_name = place.data["name"]

        memo_rows = (
            sb.table("appointment_meeting_memos")
            .select("user_id, body, updated_at")
            .eq("appointment_id", apt["id"])
            .execute()
        )
        memos = memo_rows.data or []
        my_memo = next((m for m in memos if str(m["user_id"]) == user_id), None)
        preview = None
        my_updated = None
        if my_memo and (my_memo.get("body") or "").strip():
            preview = (my_memo["body"] or "").strip()[:120]
            my_updated = my_memo.get("updated_at")

        items.append(
            MeetingMemoryListItem(
                appointment_id=str(apt["id"]),
                room_id=str(apt["room_id"]),
                room_name=room_data.get("name") or "방",
                room_type=room_data.get("room_type") or "REGULAR",
                title=apt["title"],
                confirmed_date=apt["confirmed_date"],
                confirmed_time=apt["confirmed_time"],
                place_id=str(place_id) if place_id else None,
                place_name=place_name,
                my_memo_preview=preview,
                my_memo_updated_at=my_updated,
                memo_count=len([m for m in memos if (m.get("body") or "").strip()]),
            )
        )
    return items


@router.get("/{appointment_id}/meeting-memos", response_model=list[MeetingMemoryMemoItem])
async def list_appointment_meeting_memos(
    appointment_id: UUID, user_id: str = Depends(get_current_user_id)
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["room_id"], user_id)
    if apt.get("status") != AppointmentStatus.confirmed.value:
        raise HTTPException(status_code=400, detail="확정된 약속만 조회할 수 있습니다")

    rows = (
        sb.table("appointment_meeting_memos")
        .select("id, user_id, body, created_at, updated_at, profiles(display_name)")
        .eq("appointment_id", str(appointment_id))
        .order("updated_at", desc=True)
        .execute()
    )
    items: list[MeetingMemoryMemoItem] = []
    for row in rows.data or []:
        body = (row.get("body") or "").strip()
        if not body:
            continue
        prof = row.get("profiles") or {}
        items.append(
            MeetingMemoryMemoItem(
                id=str(row["id"]),
                user_id=str(row["user_id"]),
                display_name=prof.get("display_name") or "알 수 없음",
                body=body,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                is_me=str(row["user_id"]) == user_id,
            )
        )
    return items


@router.put("/{appointment_id}/meeting-memos/me", response_model=MeetingMemoryMemoItem)
async def upsert_my_meeting_memo(
    appointment_id: UUID,
    body: MeetingMemoryMemoUpsert,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["room_id"], user_id)
    if apt.get("status") != AppointmentStatus.confirmed.value:
        raise HTTPException(status_code=400, detail="확정된 약속에만 메모를 남길 수 있습니다")

    trimmed = (body.body or "").strip()
    existing = (
        sb.table("appointment_meeting_memos")
        .select("id")
        .eq("appointment_id", str(appointment_id))
        .eq("user_id", user_id)
        .execute()
    )
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {"body": trimmed, "updated_at": now_iso}
    if existing.data:
        saved = (
            sb.table("appointment_meeting_memos")
            .update(payload)
            .eq("appointment_id", str(appointment_id))
            .eq("user_id", user_id)
            .execute()
        )
        row = saved.data[0]
    else:
        saved = (
            sb.table("appointment_meeting_memos")
            .insert(
                {
                    "appointment_id": str(appointment_id),
                    "user_id": user_id,
                    "body": trimmed,
                }
            )
            .execute()
        )
        row = saved.data[0]

    prof = (
        sb.table("profiles")
        .select("display_name")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return MeetingMemoryMemoItem(
        id=str(row["id"]),
        user_id=user_id,
        display_name=(prof.data or {}).get("display_name") or "나",
        body=trimmed,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        is_me=True,
    )


@router.get("/room/{room_id}", response_model=list[AppointmentResponse])
async def list_room_appointments(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(room_id), user_id)
    result = (
        sb.table("appointments")
        .select("*")
        .eq("room_id", str(room_id))
        .order("created_at", desc=True)
        .execute()
    )
    return [AppointmentResponse(**a) for a in result.data]


@router.post("", response_model=AppointmentResponse, status_code=201)
async def create_appointment(body: AppointmentCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(body.room_id), user_id)
    result = (
        sb.table("appointments")
        .insert({
            "room_id": str(body.room_id),
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
    _ensure_member(sb, apt["room_id"], user_id)
    return AppointmentResponse(**apt)


@router.post("/{appointment_id}/date-votes", status_code=201)
async def submit_date_vote(
    appointment_id: UUID,
    body: DateVoteCreate,
    user_id: str = Depends(get_current_user_id),
    unlimited: bool = Depends(get_debug_unlimited_flag),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["room_id"], user_id)
    if not unlimited and apt["status"] != AppointmentStatus.date_voting.value:
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
    _ensure_member(sb, apt["room_id"], user_id)

    members = sb.table("room_members").select("user_id").eq("room_id", apt["room_id"]).execute()
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
async def advance_to_time_vote(
    appointment_id: UUID,
    user_id: str = Depends(get_current_user_id),
    unlimited: bool = Depends(get_debug_unlimited_flag),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    if apt["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="약속 생성자만 진행할 수 있습니다")
    if not unlimited and apt["status"] != AppointmentStatus.date_voting.value:
        raise HTTPException(status_code=400, detail="날짜 투표 단계가 아닙니다")

    sb.table("appointments").update({"status": AppointmentStatus.time_voting.value}).eq(
        "id", str(appointment_id)
    ).execute()
    return {"status": "time_voting"}


@router.post("/{appointment_id}/time-votes", status_code=201)
async def submit_time_vote(
    appointment_id: UUID,
    body: TimeVoteCreate,
    user_id: str = Depends(get_current_user_id),
    unlimited: bool = Depends(get_debug_unlimited_flag),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["room_id"], user_id)
    if not unlimited and apt["status"] != AppointmentStatus.time_voting.value:
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
    _ensure_member(sb, apt["room_id"], user_id)

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
        slot_scores[key] += 4 - v["priority"]

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
    place_id: UUID | None = None,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    if apt["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="약속 생성자만 확정할 수 있습니다")

    update_data = {
        "status": AppointmentStatus.confirmed.value,
        "confirmed_date": vote_date,
        "confirmed_time": vote_time,
    }
    if place_id:
        update_data["confirmed_place_id"] = str(place_id)

    sb.table("appointments").update(update_data).eq("id", str(appointment_id)).execute()

    members = sb.table("room_members").select("user_id").eq("room_id", apt["room_id"]).execute()
    for m in members.data:
        sb.table("appointment_attendance").upsert(
            {
                "appointment_id": str(appointment_id),
                "user_id": m["user_id"],
                "attended_on": vote_date,
            },
            on_conflict="appointment_id,user_id",
        ).execute()

    if place_id:
        place = sb.table("places").select("recommended_by").eq("id", str(place_id)).single().execute()
        if place.data and place.data["recommended_by"]:
            recommender_id = place.data["recommended_by"]
            profile = (
                sb.table("profiles")
                .select("places_adopted_count")
                .eq("id", recommender_id)
                .single()
                .execute()
            )
            sb.table("profiles").update({
                "places_adopted_count": (profile.data["places_adopted_count"] or 0) + 1,
            }).eq("id", recommender_id).execute()

        await record_confirm_travel_logs(sb, str(appointment_id), str(place_id), apt["room_id"])

    return {"status": "confirmed", "date": vote_date, "time": vote_time}


@router.get("/{appointment_id}/briefing", response_model=AppointmentBriefingResponse)
async def get_appointment_briefing(appointment_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["room_id"], user_id)
    try:
        return await build_briefing(sb, str(appointment_id), user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{appointment_id}/comments", response_model=AppointmentCommentResponse, status_code=201)
async def add_appointment_comment(
    appointment_id: UUID,
    body: AppointmentCommentCreate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["room_id"], user_id)
    if apt["status"] != AppointmentStatus.confirmed.value:
        raise HTTPException(status_code=400, detail="확정된 약속에만 댓글을 남길 수 있습니다")
    return await post_comment(sb, str(appointment_id), user_id, body)


@router.patch("/{appointment_id}/departure-status")
async def update_departure_status(
    appointment_id: UUID,
    body: DepartureStatusUpdate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["room_id"], user_id)
    set_departure_status(sb, str(appointment_id), user_id, body.status)
    return {"ok": True, "status": body.status.value}


@router.get("/{appointment_id}/settlement", response_model=MeetingSettlement)
async def get_meeting_settlement(appointment_id: UUID, user_id: str = Depends(get_current_user_id)):
    """모임 결산: 센스킹 👑 / 프로 여정러 🧭"""
    sb = get_supabase()
    apt = _get_appointment(sb, str(appointment_id))
    _ensure_member(sb, apt["room_id"], user_id)

    existing = (
        sb.table("appointment_settlements")
        .select("*")
        .eq("appointment_id", str(appointment_id))
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        return _build_settlement_response(sb, row)

    sense = (
        sb.table("profiles")
        .select("id, display_name, places_adopted_count")
        .order("places_adopted_count", desc=True)
        .limit(1)
        .execute()
    )
    pro = (
        sb.table("user_travel_logs")
        .select("user_id, duration_minutes, distance_meters, profiles(display_name)")
        .eq("appointment_id", str(appointment_id))
        .order("duration_minutes", desc=True)
        .limit(1)
        .execute()
    )

    sense_row = sense.data[0] if sense.data else None
    pro_row = pro.data[0] if pro.data else None

    settlement = {
        "appointment_id": str(appointment_id),
        "sense_king_user_id": sense_row["id"] if sense_row else None,
        "pro_traveler_user_id": pro_row["user_id"] if pro_row else None,
        "pro_travel_duration_minutes": pro_row["duration_minutes"] if pro_row else None,
        "pro_travel_distance_meters": pro_row["distance_meters"] if pro_row else None,
    }
    saved = sb.table("appointment_settlements").insert(settlement).execute()
    return _build_settlement_response(sb, saved.data[0])


def _build_settlement_response(sb, row: dict) -> MeetingSettlement:
    sense_name = None
    pro_name = None
    adopted = 0

    if row.get("sense_king_user_id"):
        p = sb.table("profiles").select("display_name, places_adopted_count").eq(
            "id", row["sense_king_user_id"]
        ).single().execute()
        if p.data:
            sense_name = p.data["display_name"]
            adopted = p.data["places_adopted_count"] or 0

    if row.get("pro_traveler_user_id"):
        p = sb.table("profiles").select("display_name").eq(
            "id", row["pro_traveler_user_id"]
        ).single().execute()
        if p.data:
            pro_name = p.data["display_name"]

    return MeetingSettlement(
        sense_king_user_id=row.get("sense_king_user_id"),
        sense_king_name=sense_name,
        sense_king_adopted_count=adopted,
        pro_traveler_user_id=row.get("pro_traveler_user_id"),
        pro_traveler_name=pro_name,
        pro_travel_duration_minutes=row.get("pro_travel_duration_minutes"),
        pro_travel_distance_meters=row.get("pro_travel_distance_meters"),
    )


def _get_appointment(sb, appointment_id: str) -> dict:
    result = sb.table("appointments").select("*").eq("id", appointment_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="약속을 찾을 수 없습니다")
    return result.data
