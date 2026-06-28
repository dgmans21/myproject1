from uuid import UUID

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import (
    RoomActivityDay,
    RoomCreate,
    RoomInviteRequest,
    RoomResponse,
    RoomType,
    RoomUpdate,
)
from app.services.rooms import is_fixed_room, validate_expire_date_update, validate_room_create

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _member_count(sb, room_id: str) -> int:
    result = sb.table("room_members").select("id", count="exact").eq("room_id", room_id).execute()
    return result.count or 0


def _to_room_response(sb, row: dict) -> RoomResponse:
    return RoomResponse(
        **row,
        member_count=_member_count(sb, row["id"]),
    )


def _ensure_member(sb, room_id: str, user_id: str):
    result = (
        sb.table("room_members")
        .select("id")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=403, detail="방 멤버가 아닙니다")


def _ensure_owner(sb, room_id: str, user_id: str):
    result = (
        sb.table("room_members")
        .select("role")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data or result.data["role"] != "OWNER":
        raise HTTPException(status_code=403, detail="방장만 수행할 수 있습니다")


@router.get("", response_model=list[RoomResponse])
async def list_my_rooms(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    memberships = sb.table("room_members").select("room_id").eq("user_id", user_id).execute()
    room_ids = [m["room_id"] for m in memberships.data]
    if not room_ids:
        return []

    rooms = sb.table("rooms").select("*").in_("id", room_ids).order("created_at", desc=True).execute()
    now = datetime.now(timezone.utc)
    filtered = []
    for r in rooms.data:
        if r.get("room_status") == "ARCHIVED":
            continue
        if not r.get("is_fixed") and r.get("expire_at"):
            exp = datetime.fromisoformat(r["expire_at"].replace("Z", "+00:00"))
            if exp <= now:
                continue
        filtered.append(r)

    return [_to_room_response(sb, r) for r in filtered]


@router.post("", response_model=RoomResponse, status_code=201)
async def create_room(body: RoomCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    fixed = is_fixed_room(body.room_type)
    expire_at = validate_room_create(body.room_type, body.expire_date)

    room_data = {
        "name": body.name,
        "description": body.description,
        "purpose": body.purpose,
        "room_type": body.room_type.value,
        "is_fixed": fixed,
        "created_by": user_id,
    }
    if expire_at is not None:
        room_data["expire_at"] = expire_at.isoformat()
    if body.accent_color:
        room_data["accent_color"] = body.accent_color

    result = sb.table("rooms").insert(room_data).execute()
    room = result.data[0]

    sb.table("room_members").insert(
        {"room_id": room["id"], "user_id": user_id, "role": "OWNER"}
    ).execute()

    sb.rpc("log_room_activity_day", {"p_room_id": room["id"]}).execute()

    return _to_room_response(sb, room)


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(room_id), user_id)
    result = sb.table("rooms").select("*").eq("id", str(room_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return _to_room_response(sb, result.data)


@router.get("/{room_id}/activity-heatmap", response_model=list[RoomActivityDay])
async def get_room_activity_heatmap(
    room_id: UUID,
    days: int = 90,
    user_id: str = Depends(get_current_user_id),
):
    """방별 활동 잔디 (약속·투표 등 room activity 트리거 기록)"""
    sb = get_supabase()
    _ensure_member(sb, str(room_id), user_id)
    capped = min(max(days, 7), 365)
    result = (
        sb.table("room_activity_days")
        .select("activity_on, event_count")
        .eq("room_id", str(room_id))
        .order("activity_on", desc=True)
        .limit(capped)
        .execute()
    )
    return [
        RoomActivityDay(activity_on=row["activity_on"], event_count=row["event_count"])
        for row in result.data
    ]


@router.patch("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: UUID,
    body: RoomUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """방장: 방 이름·설명·임시방 만료일 변경"""
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)
    room = sb.table("rooms").select("*").eq("id", str(room_id)).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")

    update_data = body.model_dump(exclude_none=True)
    if "expire_date" in update_data:
        expire_date = update_data.pop("expire_date")
        expire_at = validate_expire_date_update(room.data.get("is_fixed", False), expire_date)
        update_data["expire_at"] = expire_at.isoformat() if expire_at else None

    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")

    result = sb.table("rooms").update(update_data).eq("id", str(room_id)).execute()
    return _to_room_response(sb, result.data[0])


@router.post("/{room_id}/promote", response_model=RoomResponse)
async def promote_to_regular(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    """임시방 → 고정방 승격 (만료일 제거)"""
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)
    room = sb.table("rooms").select("*").eq("id", str(room_id)).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    if room.data.get("is_fixed") or room.data["room_type"] == RoomType.REGULAR.value:
        raise HTTPException(status_code=400, detail="이미 고정방입니다")

    from datetime import datetime, timezone

    result = (
        sb.table("rooms")
        .update({
            "room_type": RoomType.REGULAR.value,
            "is_fixed": True,
            "expire_at": None,
            "promoted_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", str(room_id))
        .execute()
    )
    return _to_room_response(sb, result.data[0])


@router.post("/{room_id}/invite", status_code=201)
async def invite_member(
    room_id: UUID,
    body: RoomInviteRequest,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)

    invitee_id = str(body.invitee_id)
    if invitee_id == user_id:
        raise HTTPException(status_code=400, detail="본인은 초대할 수 없습니다")

    existing = (
        sb.table("room_members")
        .select("id")
        .eq("room_id", str(room_id))
        .eq("user_id", invitee_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="이미 방 멤버입니다")

    sb.table("room_invitations").upsert(
        {
            "room_id": str(room_id),
            "inviter_id": user_id,
            "invitee_id": invitee_id,
            "status": "pending",
        },
        on_conflict="room_id,invitee_id",
    ).execute()
    return {"ok": True}


@router.post("/{room_id}/members", status_code=201)
async def accept_invitation(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    room = sb.table("rooms").select("*").eq("id", str(room_id)).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    if not room.data.get("is_fixed") and room.data.get("expire_at"):
        exp = datetime.fromisoformat(room.data["expire_at"].replace("Z", "+00:00"))
        if exp <= datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="만료된 방입니다")

    invite = (
        sb.table("room_invitations")
        .select("*")
        .eq("room_id", str(room_id))
        .eq("invitee_id", user_id)
        .eq("status", "pending")
        .execute()
    )
    if not invite.data:
        raise HTTPException(status_code=404, detail="초대를 찾을 수 없습니다")

    sb.table("room_invitations").update({"status": "accepted"}).eq("id", invite.data[0]["id"]).execute()
    sb.table("room_members").upsert(
        {"room_id": str(room_id), "user_id": user_id, "role": "MEMBER"},
        on_conflict="room_id,user_id",
    ).execute()
    return {"ok": True}


@router.post("/{room_id}/invite/reject", status_code=200)
async def reject_invitation(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    """초대 대상: pending 초대 거절"""
    sb = get_supabase()
    invite = (
        sb.table("room_invitations")
        .select("*")
        .eq("room_id", str(room_id))
        .eq("invitee_id", user_id)
        .eq("status", "pending")
        .execute()
    )
    if not invite.data:
        raise HTTPException(status_code=404, detail="초대를 찾을 수 없습니다")

    sb.table("room_invitations").update({"status": "rejected"}).eq("id", invite.data[0]["id"]).execute()
    return {"ok": True}


@router.delete("/{room_id}/members/{member_id}", status_code=204)
async def kick_member(
    room_id: UUID,
    member_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    """방장: 멤버 추방"""
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)
    if str(member_id) == user_id:
        raise HTTPException(status_code=400, detail="방장은 스스로 추방할 수 없습니다")
    sb.table("room_members").delete().eq("room_id", str(room_id)).eq("user_id", str(member_id)).execute()


@router.delete("/{room_id}", status_code=204)
async def delete_one_time_room(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)
    room = sb.table("rooms").select("*").eq("id", str(room_id)).single().execute()
    if room.data.get("is_fixed") or room.data["room_type"] == RoomType.REGULAR.value:
        raise HTTPException(status_code=400, detail="고정방은 여기서 삭제할 수 없습니다")
    sb.table("rooms").delete().eq("id", str(room_id)).execute()
