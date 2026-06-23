from datetime import datetime, time, timedelta, timezone

from app.database import get_supabase
from app.models.schemas import (
    AppointmentBriefingResponse,
    AppointmentCommentCreate,
    AppointmentCommentResponse,
    DepartureStatus,
    MemberBriefingStatus,
)
from app.services.kakao import get_travel_time


async def record_confirm_travel_logs(sb, appointment_id: str, place_id: str, room_id: str) -> None:
    """약속 확정 시 방 멤버별 출발지→장소 이동시간을 일괄 기록"""
    place = sb.table("places").select("lat, lng").eq("id", place_id).single().execute()
    if not place.data:
        return

    dest_lat = place.data["lat"]
    dest_lng = place.data["lng"]

    members = (
        sb.table("room_members")
        .select("user_id, profiles(home_lat, home_lng, home_address, residence)")
        .eq("room_id", room_id)
        .execute()
    )

    for row in members.data or []:
        prof = row.get("profiles") or {}
        lat, lng = prof.get("home_lat"), prof.get("home_lng")
        if lat is None or lng is None:
            continue
        try:
            result = await get_travel_time(float(lat), float(lng), dest_lat, dest_lng)
        except Exception:
            continue
        sb.table("user_travel_logs").insert({
            "user_id": row["user_id"],
            "place_id": place_id,
            "appointment_id": appointment_id,
            "duration_minutes": result.duration_minutes,
            "distance_meters": result.distance_meters,
        }).execute()


def _origin_label(prof: dict) -> str:
    if prof.get("home_address"):
        return prof["home_address"]
    if prof.get("residence"):
        return prof["residence"]
    return "출발지 미등록"


def _punctuality(start: datetime, duration_min: int, departed: bool) -> str:
    if not departed:
        return "unknown"
    arrival = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=duration_min)
    diff = int((arrival - start).total_seconds() // 60)
    if diff <= 0:
        return "ok"
    if diff <= 15:
        return "risk"
    return "late"


async def build_briefing(sb, appointment_id: str, user_id: str) -> AppointmentBriefingResponse:
    apt = sb.table("appointments").select("*").eq("id", appointment_id).single().execute()
    if not apt.data:
        raise ValueError("약속을 찾을 수 없습니다")

    row = apt.data
    if row["status"] != "confirmed" or not row.get("confirmed_date") or not row.get("confirmed_time"):
        raise ValueError("확정된 약속만 브리핑을 조회할 수 있습니다")

    place_name = ""
    place_address = ""
    dest_lat = dest_lng = None
    if row.get("confirmed_place_id"):
        place = (
            sb.table("places")
            .select("name, address, lat, lng")
            .eq("id", row["confirmed_place_id"])
            .single()
            .execute()
        )
        if place.data:
            place_name = place.data["name"]
            place_address = place.data["address"]
            dest_lat = place.data["lat"]
            dest_lng = place.data["lng"]

    members_raw = (
        sb.table("room_members")
        .select("user_id, profiles(display_name, home_lat, home_lng, home_address, residence)")
        .eq("room_id", row["room_id"])
        .execute()
    )

    departure_rows = (
        sb.table("appointment_member_departure")
        .select("user_id, status")
        .eq("appointment_id", appointment_id)
        .execute()
    )
    departure_map = {d["user_id"]: d["status"] for d in (departure_rows.data or [])}

    confirmed_date = row["confirmed_date"]
    confirmed_time_str = row["confirmed_time"]
    if isinstance(confirmed_time_str, str):
        hh, mm, *_ = confirmed_time_str.split(":")
        confirmed_time = time(int(hh), int(mm))
    else:
        confirmed_time = confirmed_time_str

    start_naive = datetime.combine(confirmed_date, confirmed_time)
    now = datetime.now()
    minutes_until = int((start_naive - now).total_seconds() // 60)
    meeting_ended = now >= start_naive + timedelta(hours=3)

    member_statuses: list[MemberBriefingStatus] = []
    for m in members_raw.data or []:
        prof = m.get("profiles") or {}
        uid = m["user_id"]
        dep = departure_map.get(uid, DepartureStatus.NOT_DEPARTED.value)
        departed = dep == DepartureStatus.EN_ROUTE.value

        duration = None
        distance = None
        if dest_lat is not None and prof.get("home_lat") is not None:
            log = (
                sb.table("user_travel_logs")
                .select("duration_minutes, distance_meters")
                .eq("appointment_id", appointment_id)
                .eq("user_id", uid)
                .order("recorded_at", desc=True)
                .limit(1)
                .execute()
            )
            if log.data:
                duration = log.data[0]["duration_minutes"]
                distance = log.data[0]["distance_meters"]
            elif departed:
                try:
                    live = await get_travel_time(
                        float(prof["home_lat"]),
                        float(prof["home_lng"]),
                        dest_lat,
                        dest_lng,
                    )
                    duration = live.duration_minutes
                    distance = live.distance_meters
                except Exception:
                    pass

        eta_str = None
        if duration is not None and departed:
            eta = now + timedelta(minutes=duration)
            eta_str = eta.strftime("%H:%M")

        member_statuses.append(
            MemberBriefingStatus(
                user_id=uid,
                display_name=prof.get("display_name") or "멤버",
                origin_label=_origin_label(prof),
                duration_minutes=duration,
                distance_meters=distance,
                estimated_arrival=eta_str,
                punctuality=_punctuality(start_naive, duration or 0, departed),
                departure_status=DepartureStatus(dep),
                is_me=uid == user_id,
            )
        )

    comments_raw = (
        sb.table("appointment_comments")
        .select("id, user_id, body, created_at, profiles(display_name)")
        .eq("appointment_id", appointment_id)
        .order("created_at")
        .execute()
    )
    comments = [
        AppointmentCommentResponse(
            id=c["id"],
            user_id=c["user_id"],
            display_name=(c.get("profiles") or {}).get("display_name") or "멤버",
            body=c["body"],
            created_at=c["created_at"],
            is_me=c["user_id"] == user_id,
        )
        for c in (comments_raw.data or [])
    ]

    return AppointmentBriefingResponse(
        appointment_id=appointment_id,
        title=row["title"],
        confirmed_date=confirmed_date,
        confirmed_time=confirmed_time,
        place_name=place_name,
        place_address=place_address,
        minutes_until_start=minutes_until,
        meeting_ended=meeting_ended,
        members=member_statuses,
        comments=comments,
    )


async def post_comment(sb, appointment_id: str, user_id: str, body: AppointmentCommentCreate):
    result = (
        sb.table("appointment_comments")
        .insert({
            "appointment_id": appointment_id,
            "user_id": user_id,
            "body": body.body.strip(),
        })
        .execute()
    )
    row = result.data[0]
    prof = sb.table("profiles").select("display_name").eq("id", user_id).single().execute()
    return AppointmentCommentResponse(
        id=row["id"],
        user_id=user_id,
        display_name=prof.data["display_name"] if prof.data else "나",
        body=row["body"],
        created_at=row["created_at"],
        is_me=True,
    )


def set_departure_status(sb, appointment_id: str, user_id: str, status: DepartureStatus):
    sb.table("appointment_member_departure").upsert(
        {
            "appointment_id": appointment_id,
            "user_id": user_id,
            "status": status.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="appointment_id,user_id",
    ).execute()
