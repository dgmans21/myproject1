from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import (
    TeamMilestoneItem,
    TeamScheduleDayMemoResponse,
    TeamScheduleMemoUpsert,
    TeamScheduleWeekBoard,
    TeamScheduleWeekSave,
)
from app.routers.rooms import _ensure_member
from app.services.team_schedule import (
    build_week_board,
    list_milestones,
    list_month_memos,
    monday_of,
    save_my_week,
    toggle_milestone,
    upsert_day_memo,
)

router = APIRouter(prefix="/rooms", tags=["team-schedule"])


@router.get("/{room_id}/team-schedule/memos", response_model=list[TeamScheduleDayMemoResponse])
async def get_team_schedule_memos(
    room_id: UUID,
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=0, le=11, description="0-indexed month (JS Date style)"),
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    return list_month_memos(sb, rid, year, month)


@router.put("/{room_id}/team-schedule/memos", response_model=TeamScheduleDayMemoResponse | None)
async def put_team_schedule_memo(
    room_id: UUID,
    body: TeamScheduleMemoUpsert,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    return upsert_day_memo(sb, rid, user_id, body.schedule_date, body.memo)


@router.get("/{room_id}/team-schedule/week", response_model=TeamScheduleWeekBoard)
async def get_team_schedule_week(
    room_id: UUID,
    week_start: date | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    start = week_start or monday_of(date.today())
    return build_week_board(sb, rid, user_id, start)


@router.put("/{room_id}/team-schedule/week", response_model=TeamScheduleWeekBoard)
async def put_team_schedule_week(
    room_id: UUID,
    body: TeamScheduleWeekSave,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    return save_my_week(sb, rid, user_id, body.week_start, body.slots, body.other_times)


@router.get("/{room_id}/team-schedule/milestones", response_model=list[TeamMilestoneItem])
async def get_team_schedule_milestones(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    return list_milestones(sb, rid)


@router.patch("/{room_id}/team-schedule/milestones/{item_id}", response_model=list[TeamMilestoneItem])
async def patch_team_schedule_milestone(
    room_id: UUID,
    item_id: str,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    return toggle_milestone(sb, rid, item_id)
