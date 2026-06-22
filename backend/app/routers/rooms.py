from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import RoomCreate, RoomInviteRequest, RoomResponse, RoomType, RoomUpdate

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _member_count(sb, room_id: str) -> int:
    result = sb.table("room_members").select("id", count="exact").eq("room_id", room_id).execute()
    return result.count or 0


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
    return [
        RoomResponse(**r, member_count=_member_count(sb, r["id"]))
        for r in rooms.data
        if r.get("room_status") != "ARCHIVED"
    ]


@router.post("", response_model=RoomResponse, status_code=201)
async def create_room(body: RoomCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    room_data = {
        "name": body.name,
        "description": body.description,
        "purpose": body.purpose,
        "room_type": body.room_type.value,
        "created_by": user_id,
    }

    result = sb.table("rooms").insert(room_data).execute()
    room = result.data[0]

    sb.table("room_members").insert(
        {"room_id": room["id"], "user_id": user_id, "role": "OWNER"}
    ).execute()

    return RoomResponse(**room, member_count=1)


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(room_id), user_id)
    result = sb.table("rooms").select("*").eq("id", str(room_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return RoomResponse(**result.data, member_count=_member_count(sb, str(room_id)))


@router.patch("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: UUID,
    body: RoomUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """방장: 방 이름·설명 변경"""
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")
    result = sb.table("rooms").update(update_data).eq("id", str(room_id)).execute()
    return RoomResponse(**result.data[0], member_count=_member_count(sb, str(room_id)))


@router.post("/{room_id}/promote", response_model=RoomResponse)
async def promote_to_regular(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    """휘발성 방 → 정식 고정 그룹 승격"""
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)
    room = sb.table("rooms").select("*").eq("id", str(room_id)).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    if room.data["room_type"] == RoomType.REGULAR.value:
        raise HTTPException(status_code=400, detail="이미 정식 그룹입니다")

    from datetime import datetime, timezone

    result = (
        sb.table("rooms")
        .update({
            "room_type": RoomType.REGULAR.value,
            "promoted_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", str(room_id))
        .execute()
    )
    return RoomResponse(**result.data[0], member_count=_member_count(sb, str(room_id)))


@router.post("/{room_id}/invite", status_code=201)
async def invite_member(
    room_id: UUID,
    body: RoomInviteRequest,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    _ensure_owner(sb, str(room_id), user_id)
    sb.table("room_invitations").upsert(
        {
            "room_id": str(room_id),
            "inviter_id": user_id,
            "invitee_id": str(body.invitee_id),
            "status": "pending",
        },
        on_conflict="room_id,invitee_id",
    ).execute()
    return {"ok": True}


@router.post("/{room_id}/members", status_code=201)
async def accept_invitation(room_id: UUID, user_id: str = Depends(get_current_user_id)):
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

    sb.table("room_invitations").update({"status": "accepted"}).eq("id", invite.data[0]["id"]).execute()
    sb.table("room_members").upsert(
        {"room_id": str(room_id), "user_id": user_id, "role": "MEMBER"},
        on_conflict="room_id,user_id",
    ).execute()
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
    if room.data["room_type"] != RoomType.ONE_TIME.value:
        raise HTTPException(status_code=400, detail="정식 그룹은 삭제할 수 없습니다")
    sb.table("rooms").delete().eq("id", str(room_id)).execute()
