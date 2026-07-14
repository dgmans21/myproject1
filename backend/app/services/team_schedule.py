from calendar import monthrange
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException

from app.models.schemas import (
    TeamMilestoneItem,
    TeamScheduleDayMemoResponse,
    TeamScheduleMemberWeek,
    TeamScheduleWeekBoard,
)


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def list_month_memos(sb, room_id: str, year: int, month: int) -> list[TeamScheduleDayMemoResponse]:
    start = f"{year:04d}-{month + 1:02d}-01"
    last_day = monthrange(year, month + 1)[1]
    end = f"{year:04d}-{month + 1:02d}-{last_day:02d}"
    rows = (
        sb.table("team_schedule_day_memos")
        .select("id, room_id, user_id, schedule_date, memo, updated_at, profiles(display_name)")
        .eq("room_id", room_id)
        .gte("schedule_date", start)
        .lte("schedule_date", end)
        .order("schedule_date")
        .execute()
    )
    items: list[TeamScheduleDayMemoResponse] = []
    for row in rows.data or []:
        schedule_date = str(row["schedule_date"])
        prof = row.get("profiles") or {}
        items.append(
            TeamScheduleDayMemoResponse(
                id=str(row["id"]),
                room_id=str(row["room_id"]),
                user_id=str(row["user_id"]),
                display_name=prof.get("display_name") or "멤버",
                schedule_date=schedule_date,
                memo=row["memo"],
                updated_at=row["updated_at"],
            )
        )
    return items


def upsert_day_memo(
    sb, room_id: str, user_id: str, schedule_date: date, memo: str
) -> TeamScheduleDayMemoResponse | None:
    trimmed = memo.strip()
    date_str = schedule_date.isoformat()
    existing = (
        sb.table("team_schedule_day_memos")
        .select("id")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .eq("schedule_date", date_str)
        .execute()
    )
    if not trimmed:
        if existing.data:
            sb.table("team_schedule_day_memos").delete().eq("id", existing.data[0]["id"]).execute()
        return None

    now = datetime.now(timezone.utc).isoformat()
    if existing.data:
        sb.table("team_schedule_day_memos").update({"memo": trimmed, "updated_at": now}).eq(
            "id", existing.data[0]["id"]
        ).execute()
        memo_id = existing.data[0]["id"]
    else:
        inserted = (
            sb.table("team_schedule_day_memos")
            .insert(
                {
                    "room_id": room_id,
                    "user_id": user_id,
                    "schedule_date": date_str,
                    "memo": trimmed,
                    "updated_at": now,
                }
            )
            .execute()
        )
        memo_id = inserted.data[0]["id"]

    prof = sb.table("profiles").select("display_name").eq("id", user_id).single().execute()
    row = (
        sb.table("team_schedule_day_memos")
        .select("*")
        .eq("id", memo_id)
        .single()
        .execute()
    )
    return TeamScheduleDayMemoResponse(
        id=str(row.data["id"]),
        room_id=str(row.data["room_id"]),
        user_id=str(row.data["user_id"]),
        display_name=(prof.data or {}).get("display_name") or "나",
        schedule_date=str(row.data["schedule_date"]),
        memo=row.data["memo"],
        updated_at=row.data["updated_at"],
    )


def build_week_board(sb, room_id: str, user_id: str, week_start: date) -> TeamScheduleWeekBoard:
    week_str = week_start.isoformat()
    members_rows = (
        sb.table("room_members")
        .select("user_id, profiles(display_name)")
        .eq("room_id", room_id)
        .execute()
    )
    slot_rows = (
        sb.table("team_schedule_week_availability")
        .select("user_id, slot_key, available")
        .eq("room_id", room_id)
        .eq("week_start", week_str)
        .execute()
    )
    note_rows = (
        sb.table("team_schedule_week_notes")
        .select("user_id, other_times")
        .eq("room_id", room_id)
        .eq("week_start", week_str)
        .execute()
    )

    slots_by_user: dict[str, dict[str, bool]] = {}
    for row in slot_rows.data or []:
        uid = str(row["user_id"])
        if uid not in slots_by_user:
            slots_by_user[uid] = {}
        if row.get("available"):
            slots_by_user[uid][row["slot_key"]] = True

    notes_by_user = {str(r["user_id"]): r.get("other_times") or "" for r in note_rows.data or []}

    members: list[TeamScheduleMemberWeek] = []
    slot_counts: dict[str, int] = {}
    for row in members_rows.data or []:
        uid = str(row["user_id"])
        prof = row.get("profiles") or {}
        slots = slots_by_user.get(uid, {})
        members.append(
            TeamScheduleMemberWeek(
                user_id=uid,
                display_name=prof.get("display_name") or "멤버",
                is_me=uid == user_id,
                slots=slots,
                other_times=notes_by_user.get(uid, ""),
            )
        )
        for key, on in slots.items():
            if on:
                slot_counts[key] = slot_counts.get(key, 0) + 1

    return TeamScheduleWeekBoard(
        room_id=room_id,
        week_start=week_str,
        members=members,
        slot_counts=slot_counts,
    )


def save_my_week(
    sb,
    room_id: str,
    user_id: str,
    week_start: date,
    slots: dict[str, bool],
    other_times: str,
) -> TeamScheduleWeekBoard:
    week_str = week_start.isoformat()
    sb.table("team_schedule_week_availability").delete().eq("room_id", room_id).eq(
        "user_id", user_id
    ).eq("week_start", week_str).execute()

    inserts = []
    for slot_key, available in slots.items():
        if available:
            inserts.append(
                {
                    "room_id": room_id,
                    "user_id": user_id,
                    "week_start": week_str,
                    "slot_key": slot_key,
                    "available": True,
                }
            )
    if inserts:
        sb.table("team_schedule_week_availability").insert(inserts).execute()

    sb.table("team_schedule_week_notes").upsert(
        {
            "room_id": room_id,
            "user_id": user_id,
            "week_start": week_str,
            "other_times": other_times.strip(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="room_id,user_id,week_start",
    ).execute()

    return build_week_board(sb, room_id, user_id, week_start)


def list_milestones(sb, room_id: str) -> list[TeamMilestoneItem]:
    rows = (
        sb.table("team_schedule_milestones")
        .select("item_id, label, done, sort_order")
        .eq("room_id", room_id)
        .order("sort_order")
        .execute()
    )
    return [
        TeamMilestoneItem(id=r["item_id"], label=r["label"], done=bool(r["done"]))
        for r in rows.data or []
    ]


def toggle_milestone(sb, room_id: str, item_id: str) -> list[TeamMilestoneItem]:
    row = (
        sb.table("team_schedule_milestones")
        .select("done")
        .eq("room_id", room_id)
        .eq("item_id", item_id)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="마일스톤을 찾을 수 없습니다")
    sb.table("team_schedule_milestones").update({"done": not row.data["done"]}).eq(
        "room_id", room_id
    ).eq("item_id", item_id).execute()
    return list_milestones(sb, room_id)
