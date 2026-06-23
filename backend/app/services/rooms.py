from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException

from app.models.schemas import RoomType

MAX_TEMP_ROOM_DAYS = 365


def is_fixed_room(room_type: RoomType) -> bool:
    return room_type == RoomType.REGULAR


def normalize_expire_at(expire_date: date) -> datetime:
    """날짜 단위 만료 → 해당일 23:59:59 UTC"""
    return datetime.combine(expire_date, time(23, 59, 59), tzinfo=timezone.utc)


def validate_room_create(
    room_type: RoomType,
    expire_date: date | None,
) -> datetime | None:
    if is_fixed_room(room_type):
        if expire_date is not None:
            raise HTTPException(
                status_code=400,
                detail="고정방은 만료일을 지정할 수 없습니다",
            )
        return None

    if expire_date is None:
        raise HTTPException(
            status_code=400,
            detail="임시방은 터트릴 날짜(만료일)를 지정해야 합니다",
        )

    today = datetime.now(timezone.utc).date()
    if expire_date < today:
        raise HTTPException(status_code=400, detail="만료일은 오늘 이후여야 합니다")

    if expire_date > today + timedelta(days=MAX_TEMP_ROOM_DAYS):
        raise HTTPException(
            status_code=400,
            detail=f"임시방 만료일은 최대 {MAX_TEMP_ROOM_DAYS}일 이내로 설정하세요",
        )

    return normalize_expire_at(expire_date)


def validate_expire_date_update(is_fixed: bool, expire_date: date | None) -> datetime | None:
    if is_fixed:
        raise HTTPException(status_code=400, detail="고정방의 만료일은 변경할 수 없습니다")
    if expire_date is None:
        raise HTTPException(status_code=400, detail="만료일을 입력하세요")
    return validate_room_create(RoomType.ONE_TIME, expire_date)
