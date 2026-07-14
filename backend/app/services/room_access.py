from datetime import datetime, timezone

from fastapi import HTTPException


def assert_room_joinable(room: dict) -> None:
    if room.get("room_status") == "ARCHIVED":
        raise HTTPException(status_code=410, detail="보관된 방입니다")
    if not room.get("is_fixed") and room.get("expire_at"):
        exp = datetime.fromisoformat(room["expire_at"].replace("Z", "+00:00"))
        if exp <= datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="만료된 방입니다")


def is_member(sb, room_id: str, user_id: str) -> bool:
    result = (
        sb.table("room_members")
        .select("id")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(result.data)
