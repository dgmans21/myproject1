from uuid import UUID

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id, get_optional_user_id
from app.database import get_supabase
from app.models.schemas import (
    InviteLinkInfo,
    InviteTokenPreview,
    JoinPasswordUpdate,
    JoinPreview,
    JoinWithPasswordRequest,
    RoomActivityDay,
    RoomCreate,
    RoomInvitationItem,
    RoomInviteRequest,
    RoomResponse,
    RoomType,
    RoomUpdate,
    FriendSummary,
)
from app.services.invite_links import default_invite_expiry, generate_invite_token
from app.services.join_password import hash_join_password, verify_join_password
from app.services.meeting_purpose import validate_meeting_purpose_fields
from app.services.room_access import assert_room_joinable, is_member
from app.services.rooms import is_fixed_room, validate_expire_date_update, validate_room_create

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _member_count(sb, room_id: str) -> int:
    result = sb.table("room_members").select("id", count="exact").eq("room_id", room_id).execute()
    return result.count or 0


def _is_room_owner(sb, room_id: str, user_id: str) -> bool:
    result = (
        sb.table("room_members")
        .select("role")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return bool(result.data and result.data.get("role") == "OWNER")


def _owner_room_ids(sb, room_ids: list[str], user_id: str) -> set[str]:
    if not room_ids:
        return set()
    result = (
        sb.table("room_members")
        .select("room_id")
        .eq("user_id", user_id)
        .eq("role", "OWNER")
        .in_("room_id", room_ids)
        .execute()
    )
    return {r["room_id"] for r in (result.data or [])}


def _to_room_response(
    sb,
    row: dict,
    user_id: str | None = None,
    *,
    is_me_owner: bool | None = None,
) -> RoomResponse:
    payload = dict(row)
    payload["requires_join_password"] = bool(payload.pop("join_password_hash", None))
    payload["member_count"] = _member_count(sb, row["id"])
    if is_me_owner is None:
        is_me_owner = _is_room_owner(sb, str(row["id"]), user_id) if user_id else False
    payload["is_me_owner"] = is_me_owner
    return RoomResponse(**payload)


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


def _get_or_create_invite_link(sb, room_id: str, user_id: str, *, force_new: bool = False) -> dict:
    if not force_new:
        existing = (
            sb.table("room_invite_links").select("*").eq("room_id", room_id).execute()
        )
        if existing.data:
            row = existing.data[0]
            exp = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
            if exp > datetime.now(timezone.utc):
                return row

    token = generate_invite_token()
    exp = default_invite_expiry()
    row = {
        "room_id": room_id,
        "token": token,
        "expires_at": exp.isoformat(),
        "created_by": user_id,
    }
    sb.table("room_invite_links").upsert(row, on_conflict="room_id").execute()
    return row


def _invite_link_info(room_id: str, link: dict) -> InviteLinkInfo:
    return InviteLinkInfo(
        room_id=room_id,
        token=link["token"],
        expires_at=link["expires_at"],
        url=f"/join/{link['token']}",
    )


def _add_room_member(sb, room_id: str, user_id: str) -> None:
    sb.table("room_members").upsert(
        {"room_id": room_id, "user_id": user_id, "role": "MEMBER"},
        on_conflict="room_id,user_id",
    ).execute()


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

    owner_ids = _owner_room_ids(sb, [r["id"] for r in filtered], user_id)
    return [
        _to_room_response(sb, r, user_id, is_me_owner=r["id"] in owner_ids) for r in filtered
    ]


@router.get("/invitations/me", response_model=list[RoomInvitationItem])
async def list_my_invitations(user_id: str = Depends(get_current_user_id)):
    """받은 초대 (pending)"""
    sb = get_supabase()
    invites = (
        sb.table("room_invitations")
        .select("id, room_id, inviter_id, status")
        .eq("invitee_id", user_id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    if not invites.data:
        return []

    now = datetime.now(timezone.utc)
    items: list[RoomInvitationItem] = []
    for inv in invites.data:
        room = sb.table("rooms").select("name, is_fixed, expire_at, room_status").eq("id", inv["room_id"]).single().execute()
        if not room.data or room.data.get("room_status") == "ARCHIVED":
            continue
        if not room.data.get("is_fixed") and room.data.get("expire_at"):
            exp = datetime.fromisoformat(room.data["expire_at"].replace("Z", "+00:00"))
            if exp <= now:
                continue
        inviter = (
            sb.table("profiles")
            .select("display_name")
            .eq("id", inv["inviter_id"])
            .single()
            .execute()
        )
        items.append(
            RoomInvitationItem(
                id=inv["id"],
                room_id=inv["room_id"],
                room_name=room.data["name"],
                inviter_display_name=(inviter.data or {}).get("display_name") or "알 수 없음",
                status=inv["status"],
            )
        )
    return items


@router.get("/invite-links/{token}/preview", response_model=InviteTokenPreview)
async def preview_invite_token(
    token: str,
    user_id: str | None = Depends(get_optional_user_id),
):
    """초대 링크 미리보기 (비로그인 가능)"""
    sb = get_supabase()
    link = sb.table("room_invite_links").select("*").eq("token", token).execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="유효하지 않은 초대 링크입니다")

    row = link.data[0]
    room = sb.table("rooms").select("*").eq("id", row["room_id"]).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")

    exp = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
    expired = exp <= datetime.now(timezone.utc)
    member = is_member(sb, row["room_id"], user_id) if user_id else False

    return InviteTokenPreview(
        room_id=row["room_id"],
        room_name=room.data["name"],
        expires_at=row["expires_at"],
        expired=expired,
        is_member=member,
        requires_join_password=bool(room.data.get("join_password_hash")),
    )


@router.post("/invite-links/{token}/join", response_model=RoomResponse)
async def join_by_invite_token(token: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    link = sb.table("room_invite_links").select("*").eq("token", token).execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="유효하지 않은 초대 링크입니다")

    row = link.data[0]
    exp = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
    if exp <= datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="만료된 초대 링크입니다")

    room = sb.table("rooms").select("*").eq("id", row["room_id"]).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    assert_room_joinable(room.data)

    if is_member(sb, row["room_id"], user_id):
        return _to_room_response(sb, room.data, user_id)

    _add_room_member(sb, row["room_id"], user_id)
    return _to_room_response(sb, room.data, user_id)


@router.post("", response_model=RoomResponse, status_code=201)
async def create_room(body: RoomCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    fixed = is_fixed_room(body.room_type)
    expire_at = validate_room_create(body.room_type, body.expire_date)

    mp, mpc = validate_meeting_purpose_fields(
        body.room_type,
        body.meeting_purpose.value if body.meeting_purpose else None,
        body.meeting_purpose_custom,
    )

    room_data = {
        "name": body.name,
        "description": body.description,
        "purpose": body.purpose,
        "room_type": body.room_type.value,
        "is_fixed": fixed,
        "created_by": user_id,
    }
    if mp:
        room_data["meeting_purpose"] = mp
        if mpc:
            room_data["meeting_purpose_custom"] = mpc
    if expire_at is not None:
        room_data["expire_at"] = expire_at.isoformat()
    if body.accent_color:
        room_data["accent_color"] = body.accent_color
    if body.join_password and body.join_password.strip():
        room_data["join_password_hash"] = hash_join_password(body.join_password.strip())

    result = sb.table("rooms").insert(room_data).execute()
    room = result.data[0]

    sb.table("room_members").insert(
        {"room_id": room["id"], "user_id": user_id, "role": "OWNER"}
    ).execute()

    sb.rpc("log_room_activity_day", {"p_room_id": room["id"]}).execute()

    return _to_room_response(sb, room, user_id, is_me_owner=True)


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(room_id), user_id)
    result = sb.table("rooms").select("*").eq("id", str(room_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return _to_room_response(sb, result.data, user_id)


@router.get("/{room_id}/invite-link", response_model=InviteLinkInfo)
async def get_invite_link(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_owner(sb, rid, user_id)
    link = _get_or_create_invite_link(sb, rid, user_id)
    return _invite_link_info(rid, link)


@router.post("/{room_id}/invite-link/regenerate", response_model=InviteLinkInfo)
async def regenerate_invite_link(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_owner(sb, rid, user_id)
    link = _get_or_create_invite_link(sb, rid, user_id, force_new=True)
    return _invite_link_info(rid, link)


@router.get("/{room_id}/join-preview", response_model=JoinPreview)
async def preview_join(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    rid = str(room_id)
    room = sb.table("rooms").select("id, name, join_password_hash, is_fixed, expire_at, room_status").eq("id", rid).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return JoinPreview(
        room_id=room.data["id"],
        room_name=room.data["name"],
        requires_join_password=bool(room.data.get("join_password_hash")),
        is_member=is_member(sb, rid, user_id),
    )


@router.post("/{room_id}/join-with-password", response_model=RoomResponse)
async def join_with_password(
    room_id: UUID,
    body: JoinWithPasswordRequest,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    room = sb.table("rooms").select("*").eq("id", rid).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    assert_room_joinable(room.data)

    if is_member(sb, rid, user_id):
        raise HTTPException(status_code=400, detail="이미 이 방의 멤버입니다")

    stored_hash = room.data.get("join_password_hash")
    if not stored_hash:
        raise HTTPException(
            status_code=400,
            detail="이 방은 비밀번호 입장이 설정되어 있지 않습니다. 초대를 확인하세요.",
        )
    if not verify_join_password(body.password, stored_hash):
        raise HTTPException(status_code=403, detail="비밀번호가 올바르지 않습니다")

    _add_room_member(sb, rid, user_id)
    return _to_room_response(sb, room.data, user_id)


@router.put("/{room_id}/join-password")
async def set_join_password(
    room_id: UUID,
    body: JoinPasswordUpdate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_owner(sb, rid, user_id)
    password = (body.password or "").strip()
    update_data = (
        {"join_password_hash": hash_join_password(password)}
        if password
        else {"join_password_hash": None}
    )
    sb.table("rooms").update(update_data).eq("id", rid).execute()
    return {"ok": True, "requires_join_password": bool(password)}


@router.get("/{room_id}/invite-candidates", response_model=list[FriendSummary])
async def list_invite_candidates(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_owner(sb, rid, user_id)

    friend_rows = sb.table("friendships").select("friend_id").eq("user_id", user_id).execute()
    friend_ids = [r["friend_id"] for r in friend_rows.data or []]
    if not friend_ids:
        return []

    members = sb.table("room_members").select("user_id").eq("room_id", rid).execute()
    member_ids = {m["user_id"] for m in members.data or []}

    profiles = sb.table("profiles").select("id, display_name").in_("id", friend_ids).execute()
    by_id = {p["id"]: p.get("display_name") or "알 수 없음" for p in profiles.data or []}

    return [
        FriendSummary(user_id=fid, display_name=by_id.get(fid, "알 수 없음"))
        for fid in friend_ids
        if fid not in member_ids
    ]


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

    if "meeting_purpose" in update_data or "meeting_purpose_custom" in update_data:
        mp_val = update_data.get("meeting_purpose")
        if mp_val is not None and hasattr(mp_val, "value"):
            mp_val = mp_val.value
        mp, mpc = validate_meeting_purpose_fields(
            RoomType(room.data["room_type"]),
            mp_val,
            update_data.get("meeting_purpose_custom"),
        )
        update_data["meeting_purpose"] = mp
        update_data["meeting_purpose_custom"] = mpc

    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")

    result = sb.table("rooms").update(update_data).eq("id", str(room_id)).execute()
    return _to_room_response(sb, result.data[0], user_id)


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
    return _to_room_response(sb, result.data[0], user_id, is_me_owner=True)


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
