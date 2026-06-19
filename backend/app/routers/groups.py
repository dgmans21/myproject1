from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import GroupCreate, GroupResponse, GroupType

router = APIRouter(prefix="/groups", tags=["groups"])


def _member_count(sb, group_id: str) -> int:
    result = sb.table("group_members").select("id", count="exact").eq("group_id", group_id).execute()
    return result.count or 0


@router.get("", response_model=list[GroupResponse])
async def list_my_groups(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    memberships = sb.table("group_members").select("group_id").eq("user_id", user_id).execute()
    group_ids = [m["group_id"] for m in memberships.data]
    if not group_ids:
        return []

    groups = sb.table("groups").select("*").in_("id", group_ids).order("created_at", desc=True).execute()
    return [
        GroupResponse(
            **g,
            member_count=_member_count(sb, g["id"]),
        )
        for g in groups.data
    ]


@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(body: GroupCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    group_data = {
        "name": body.name,
        "description": body.description,
        "purpose": body.purpose,
        "group_type": body.group_type.value,
        "created_by": user_id,
    }
    if body.expires_at:
        group_data["expires_at"] = body.expires_at

    result = sb.table("groups").insert(group_data).execute()
    group = result.data[0]

    sb.table("group_members").insert(
        {"group_id": group["id"], "user_id": user_id, "role": "owner"}
    ).execute()

    return GroupResponse(**group, member_count=1)


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(group_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _ensure_member(sb, str(group_id), user_id)
    result = sb.table("groups").select("*").eq("id", str(group_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
    return GroupResponse(**result.data, member_count=_member_count(sb, str(group_id)))


@router.post("/{group_id}/promote", response_model=GroupResponse)
async def promote_to_formal(group_id: UUID, user_id: str = Depends(get_current_user_id)):
    """일회성 방을 정식 그룹으로 승격"""
    sb = get_supabase()
    group = sb.table("groups").select("*").eq("id", str(group_id)).single().execute()
    if not group.data:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
    if group.data["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="그룹 소유자만 승격할 수 있습니다")
    if group.data["group_type"] == GroupType.formal.value:
        raise HTTPException(status_code=400, detail="이미 정식 그룹입니다")

    from datetime import datetime, timezone

    result = (
        sb.table("groups")
        .update({
            "group_type": GroupType.formal.value,
            "promoted_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": None,
        })
        .eq("id", str(group_id))
        .execute()
    )
    return GroupResponse(**result.data[0], member_count=_member_count(sb, str(group_id)))


@router.delete("/{group_id}", status_code=204)
async def delete_ephemeral_group(group_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    group = sb.table("groups").select("*").eq("id", str(group_id)).single().execute()
    if not group.data:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
    if group.data["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="그룹 소유자만 삭제할 수 있습니다")
    if group.data["group_type"] != GroupType.ephemeral.value:
        raise HTTPException(status_code=400, detail="정식 그룹은 삭제할 수 없습니다")

    sb.table("groups").delete().eq("id", str(group_id)).execute()


def _ensure_member(sb, group_id: str, user_id: str):
    result = (
        sb.table("group_members")
        .select("id")
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=403, detail="그룹 멤버가 아닙니다")
