from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import HostTransferRequest, HostTransferRespond, HostTransferStatusResponse
from app.routers.rooms import _ensure_member
from app.services.host_transfer import (
    cancel_host_transfer,
    get_host_transfer_status,
    request_host_transfer,
    respond_host_transfer,
)

router = APIRouter(prefix="/rooms", tags=["host-transfer"])


@router.get("/{room_id}/host-transfer", response_model=HostTransferStatusResponse)
async def host_transfer_status(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    return get_host_transfer_status(sb, rid, user_id)


@router.post("/{room_id}/host-transfer", status_code=200)
async def create_host_transfer(
    room_id: UUID,
    body: HostTransferRequest,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    request_host_transfer(sb, rid, user_id, str(body.target_user_id))
    return {"ok": True}


@router.post("/{room_id}/host-transfer/respond", status_code=200)
async def respond_to_host_transfer(
    room_id: UUID,
    body: HostTransferRespond,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    return respond_host_transfer(sb, rid, user_id, body.accept)


@router.delete("/{room_id}/host-transfer", status_code=200)
async def delete_host_transfer(room_id: UUID, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    rid = str(room_id)
    _ensure_member(sb, rid, user_id)
    cancel_host_transfer(sb, rid, user_id)
    return {"ok": True}
