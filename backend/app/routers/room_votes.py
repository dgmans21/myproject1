from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import (
    PraiseSticker,
    PraiseVoteCreate,
    PraiseVotePendingTarget,
    PraiseVoteSent,
    PraiseVoteStatusResponse,
    RoomMemberSummary,
    TravelRewardCreate,
)
from app.services.social_points import PRAISE_STICKER_POINTS, TRAVEL_REWARD_POINTS

router = APIRouter(prefix="/rooms", tags=["room-votes"])


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


@router.get("/{room_id}/members", response_model=list[RoomMemberSummary])
async def list_room_members(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    rows = (
        sb.table("room_members")
        .select("user_id, role, profiles(display_name, social_points, mbti_types, selected_social_title_id)")
        .eq("room_id", rid)
        .execute()
    )
    title_rows = sb.table("social_point_titles").select("*").order("min_points").execute()
    titles = {t["id"]: t for t in title_rows.data}

    members = []
    for row in rows.data:
        prof = row.get("profiles") or {}
        social_title = None
        badge_color = None
        if prof.get("selected_social_title_id"):
            t = titles.get(prof["selected_social_title_id"])
            if t:
                social_title = t["title"]
                badge_color = t["badge_color"]
        members.append(
            RoomMemberSummary(
                user_id=row["user_id"],
                display_name=prof.get("display_name", "알 수 없음"),
                role=row["role"],
                social_points=prof.get("social_points") or 0,
                social_title=social_title,
                social_badge_color=badge_color,
                mbti_types=prof.get("mbti_types") or [],
                is_me=str(row["user_id"]) == user_id,
            )
        )
    return members


@router.get(
    "/{room_id}/appointments/{appointment_id}/praise-status",
    response_model=PraiseVoteStatusResponse,
)
async def get_praise_vote_status(
    room_id: UUID,
    appointment_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    """블라인드: 본인이 보낸 스티커만 반환 (타인 득표수 미노출)"""
    sb = get_supabase()
    rid, aid = str(room_id), str(appointment_id)
    _ensure_member(sb, rid, user_id)

    my_votes = (
        sb.table("room_votes")
        .select("target_user_id, sticker, points_awarded, created_at")
        .eq("room_id", rid)
        .eq("appointment_id", aid)
        .eq("voter_id", user_id)
        .eq("vote_kind", "PRAISE_STICKER")
        .execute()
    )

    members = (
        sb.table("room_members")
        .select("user_id, profiles(display_name)")
        .eq("room_id", rid)
        .neq("user_id", user_id)
        .execute()
    )

    voted_ids = {v["target_user_id"] for v in my_votes.data}
    return PraiseVoteStatusResponse(
        my_votes=[
            PraiseVoteSent(
                target_user_id=v["target_user_id"],
                sticker=PraiseSticker(v["sticker"]),
                points_awarded=v["points_awarded"],
            )
            for v in my_votes.data
        ],
        pending_targets=[
            PraiseVotePendingTarget(
                user_id=m["user_id"],
                display_name=(m.get("profiles") or {}).get("display_name", "멤버"),
            )
            for m in members.data
            if m["user_id"] not in voted_ids
        ],
        points_per_vote=PRAISE_STICKER_POINTS,
    )


@router.post("/{room_id}/appointments/{appointment_id}/praise-votes", status_code=201)
async def submit_praise_vote(
    room_id: UUID,
    appointment_id: UUID,
    body: PraiseVoteCreate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid, aid = str(room_id), str(appointment_id)
    _ensure_member(sb, rid, user_id)

    if str(body.target_user_id) == user_id:
        raise HTTPException(status_code=400, detail="본인에게는 스티커를 줄 수 없습니다")

    target_member = (
        sb.table("room_members")
        .select("id")
        .eq("room_id", rid)
        .eq("user_id", str(body.target_user_id))
        .execute()
    )
    if not target_member.data:
        raise HTTPException(status_code=400, detail="같은 방 멤버에게만 줄 수 있습니다")

    try:
        sb.table("room_votes").insert({
            "room_id": rid,
            "appointment_id": aid,
            "voter_id": user_id,
            "target_user_id": str(body.target_user_id),
            "vote_kind": "PRAISE_STICKER",
            "sticker": body.sticker.value,
            "points_awarded": PRAISE_STICKER_POINTS,
        }).execute()
    except Exception as e:
        if "room_votes_praise_once" in str(e) or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="이미 이 멤버에게 스티커를 보냈습니다") from e
        raise

    return {"ok": True, "points_awarded": PRAISE_STICKER_POINTS}


@router.post("/{room_id}/appointments/{appointment_id}/travel-reward", status_code=201)
async def grant_travel_reward(
    room_id: UUID,
    appointment_id: UUID,
    body: TravelRewardCreate,
    user_id: str = Depends(get_current_user_id),
):
    """가장 멀리서 온 사람 등 — 방장이 10포인트 리워드 (약속당 1명)"""
    sb = get_supabase()
    rid, aid = str(room_id), str(appointment_id)
    _ensure_owner(sb, rid, user_id)

    try:
        sb.table("room_votes").insert({
            "room_id": rid,
            "appointment_id": aid,
            "voter_id": user_id,
            "target_user_id": str(body.target_user_id),
            "vote_kind": "TRAVEL_REWARD",
            "points_awarded": TRAVEL_REWARD_POINTS,
        }).execute()
    except Exception as e:
        if "room_votes_travel_once" in str(e) or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="이 약속의 이동 리워드는 이미 지급되었습니다") from e
        raise

    return {"ok": True, "points_awarded": TRAVEL_REWARD_POINTS}
