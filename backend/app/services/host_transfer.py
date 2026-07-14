from fastapi import HTTPException

from app.models.schemas import (
    HostTransferCandidate,
    HostTransferPendingInfo,
    HostTransferStatusResponse,
)


def _display_name(sb, user_id: str) -> str:
    prof = sb.table("profiles").select("display_name").eq("id", user_id).single().execute()
    return (prof.data or {}).get("display_name") or "알 수 없음"


def get_host_transfer_status(sb, room_id: str, user_id: str) -> HostTransferStatusResponse:
    members = (
        sb.table("room_members")
        .select("user_id, role, profiles(display_name)")
        .eq("room_id", room_id)
        .execute()
    )
    rows = members.data or []
    owner = next((r for r in rows if r["role"] == "OWNER"), None)
    owner_id = owner["user_id"] if owner else None
    owner_name = (owner.get("profiles") or {}).get("display_name") if owner else None

    pending_raw = (
        sb.table("room_host_transfer_pending")
        .select("*")
        .eq("room_id", room_id)
        .execute()
    )
    pending_row = pending_raw.data[0] if pending_raw.data else None
    pending = None
    if pending_row:
        pending = HostTransferPendingInfo(
            from_user_id=pending_row["from_user_id"],
            from_display_name=_display_name(sb, pending_row["from_user_id"]),
            to_user_id=pending_row["to_user_id"],
            to_display_name=_display_name(sb, pending_row["to_user_id"]),
            is_for_me=str(pending_row["to_user_id"]) == user_id,
        )

    candidates: list[HostTransferCandidate] = []
    for row in rows:
        uid = str(row["user_id"])
        if uid == user_id:
            continue
        if owner_id and uid == str(owner_id):
            continue
        prof = row.get("profiles") or {}
        candidates.append(
            HostTransferCandidate(
                user_id=row["user_id"],
                display_name=prof.get("display_name") or "알 수 없음",
            )
        )

    return HostTransferStatusResponse(
        owner_user_id=owner_id,
        owner_display_name=owner_name,
        is_me_owner=owner_id is not None and str(owner_id) == user_id,
        pending=pending,
        transfer_candidates=candidates,
    )


def request_host_transfer(sb, room_id: str, user_id: str, target_user_id: str) -> None:
    owner = (
        sb.table("room_members")
        .select("role")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not owner.data or owner.data["role"] != "OWNER":
        raise HTTPException(status_code=403, detail="방장만 인도를 요청할 수 있습니다")

    existing = (
        sb.table("room_host_transfer_pending")
        .select("room_id")
        .eq("room_id", room_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="이미 진행 중인 인도 요청이 있습니다")

    if target_user_id == user_id:
        raise HTTPException(status_code=400, detail="본인에게는 넘길 수 없습니다")

    target = (
        sb.table("room_members")
        .select("user_id")
        .eq("room_id", room_id)
        .eq("user_id", target_user_id)
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다")

    sb.table("room_host_transfer_pending").insert(
        {
            "room_id": room_id,
            "from_user_id": user_id,
            "to_user_id": target_user_id,
        }
    ).execute()


def respond_host_transfer(sb, room_id: str, user_id: str, accept: bool) -> dict:
    pending = (
        sb.table("room_host_transfer_pending")
        .select("*")
        .eq("room_id", room_id)
        .single()
        .execute()
    )
    if not pending.data:
        raise HTTPException(status_code=404, detail="대기 중인 인도 요청이 없습니다")
    row = pending.data
    if str(row["to_user_id"]) != user_id:
        raise HTTPException(status_code=403, detail="인도 대상만 응답할 수 있습니다")

    if accept:
        sb.table("room_members").update({"role": "MEMBER"}).eq("room_id", room_id).eq(
            "user_id", row["from_user_id"]
        ).execute()
        sb.table("room_members").update({"role": "OWNER"}).eq("room_id", room_id).eq(
            "user_id", row["to_user_id"]
        ).execute()

    sb.table("room_host_transfer_pending").delete().eq("room_id", room_id).execute()
    return {"ok": True, "accepted": accept}


def cancel_host_transfer(sb, room_id: str, user_id: str) -> None:
    pending = (
        sb.table("room_host_transfer_pending")
        .select("*")
        .eq("room_id", room_id)
        .single()
        .execute()
    )
    if not pending.data:
        raise HTTPException(status_code=404, detail="취소할 인도 요청이 없습니다")
    if str(pending.data["from_user_id"]) != user_id:
        raise HTTPException(status_code=403, detail="요청한 방장만 취소할 수 있습니다")
    sb.table("room_host_transfer_pending").delete().eq("room_id", room_id).execute()
