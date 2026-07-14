from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import FriendCreate, FriendSummary

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("", response_model=list[FriendSummary])
async def list_friends(user_id: str = Depends(get_current_user_id)):
    """내가 등록한 친구 목록 (friendships.user_id → friend_id)"""
    sb = get_supabase()
    rows = sb.table("friendships").select("friend_id").eq("user_id", user_id).execute()
    friend_ids = [r["friend_id"] for r in rows.data or []]
    if not friend_ids:
        return []

    profiles = sb.table("profiles").select("id, display_name").in_("id", friend_ids).execute()
    by_id = {p["id"]: p.get("display_name") or "알 수 없음" for p in profiles.data or []}
    return [
        FriendSummary(user_id=fid, display_name=by_id.get(fid, "알 수 없음"))
        for fid in friend_ids
    ]


@router.post("", response_model=FriendSummary, status_code=201)
async def add_friend(body: FriendCreate, user_id: str = Depends(get_current_user_id)):
    friend_id = str(body.friend_id)
    if friend_id == user_id:
        raise HTTPException(status_code=400, detail="본인은 친구로 추가할 수 없습니다")

    sb = get_supabase()
    profile = sb.table("profiles").select("id, display_name").eq("id", friend_id).execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    existing = (
        sb.table("friendships")
        .select("friend_id")
        .eq("user_id", user_id)
        .eq("friend_id", friend_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="이미 친구로 등록된 사용자입니다")

    sb.table("friendships").insert({"user_id": user_id, "friend_id": friend_id}).execute()
    return FriendSummary(
        user_id=body.friend_id,
        display_name=profile.data[0].get("display_name") or "알 수 없음",
    )


@router.delete("/{friend_id}", status_code=200)
async def remove_friend(friend_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    fid = str(friend_id)
    existing = (
        sb.table("friendships")
        .select("friend_id")
        .eq("user_id", user_id)
        .eq("friend_id", fid)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="친구 관계를 찾을 수 없습니다")
    sb.table("friendships").delete().eq("user_id", user_id).eq("friend_id", fid).execute()
    return {"ok": True}
