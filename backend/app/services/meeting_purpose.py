from fastapi import HTTPException

from app.models.schemas import MeetingPurpose, RoomType

MEETING_PURPOSE_VALUES = {e.value for e in MeetingPurpose}


def validate_meeting_purpose_fields(
    room_type: RoomType,
    meeting_purpose: str | None,
    meeting_purpose_custom: str | None,
) -> tuple[str | None, str | None]:
    if room_type == RoomType.TEAM_SCHEDULE:
        if meeting_purpose or meeting_purpose_custom:
            raise HTTPException(
                status_code=400,
                detail="팀 일정방에는 모임 주목적을 설정할 수 없습니다",
            )
        return None, None

    if not meeting_purpose:
        return None, None

    if meeting_purpose not in MEETING_PURPOSE_VALUES:
        raise HTTPException(status_code=400, detail="유효하지 않은 모임 주목적입니다")

    if meeting_purpose == MeetingPurpose.OTHER.value:
        custom = (meeting_purpose_custom or "").strip()
        if not custom:
            raise HTTPException(status_code=400, detail="기타 목적을 입력하세요")
        return meeting_purpose, custom

    return meeting_purpose, None
