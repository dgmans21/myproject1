from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models.schemas import (
    SavedLocationCreate,
    SavedLocationResponse,
    SavedLocationUpdate,
)

router = APIRouter(prefix="/saved-locations", tags=["saved-locations"])

MAX_SAVED_LOCATIONS = 5


def _row_to_response(row: dict) -> SavedLocationResponse:
    return SavedLocationResponse(
        id=row["id"],
        label=row["label"],
        description=row.get("description"),
        address=row["address"],
        lat=float(row["lat"]),
        lng=float(row["lng"]),
        is_default=bool(row.get("is_default")),
        created_at=row.get("created_at"),
    )


def _clear_other_defaults(sb, user_id: str, keep_id: str | None = None) -> None:
    q = sb.table("saved_locations").update({"is_default": False}).eq("user_id", user_id)
    if keep_id:
        q = q.neq("id", keep_id)
    q.execute()


@router.get("", response_model=list[SavedLocationResponse])
async def list_saved_locations(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    result = (
        sb.table("saved_locations")
        .select("*")
        .eq("user_id", user_id)
        .order("is_default", desc=True)
        .order("created_at")
        .execute()
    )
    return [_row_to_response(r) for r in result.data or []]


@router.post("", response_model=SavedLocationResponse, status_code=201)
async def create_saved_location(
    body: SavedLocationCreate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    count = (
        sb.table("saved_locations")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    if (count.count or 0) >= MAX_SAVED_LOCATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"저장 장소는 최대 {MAX_SAVED_LOCATIONS}개까지 등록할 수 있습니다",
        )

    label = body.label.strip()
    address = body.address.strip()
    if not label or not address:
        raise HTTPException(status_code=400, detail="라벨과 주소를 입력해 주세요")

    description = (body.description or "").strip()[:10] or None

    if body.is_default:
        _clear_other_defaults(sb, user_id)

    result = (
        sb.table("saved_locations")
        .insert({
            "user_id": user_id,
            "label": label,
            "description": description,
            "address": address,
            "lat": body.lat,
            "lng": body.lng,
            "is_default": bool(body.is_default),
        })
        .execute()
    )
    return _row_to_response(result.data[0])


@router.patch("/{location_id}", response_model=SavedLocationResponse)
async def update_saved_location(
    location_id: UUID,
    body: SavedLocationUpdate,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    existing = (
        sb.table("saved_locations")
        .select("*")
        .eq("id", str(location_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="저장 장소를 찾을 수 없습니다")

    update_data = body.model_dump(exclude_none=True)
    if "label" in update_data:
        update_data["label"] = (update_data["label"] or "").strip()
        if not update_data["label"]:
            raise HTTPException(status_code=400, detail="라벨을 입력해 주세요")
    if "description" in update_data:
        desc = (update_data["description"] or "").strip()[:10]
        update_data["description"] = desc or None
    if "address" in update_data:
        update_data["address"] = (update_data["address"] or "").strip()
        if not update_data["address"]:
            raise HTTPException(status_code=400, detail="주소를 입력해 주세요")

    if update_data.get("is_default"):
        _clear_other_defaults(sb, user_id, keep_id=str(location_id))

    if not update_data:
        return _row_to_response(existing.data)

    sb.table("saved_locations").update(update_data).eq("id", str(location_id)).execute()
    refreshed = (
        sb.table("saved_locations")
        .select("*")
        .eq("id", str(location_id))
        .single()
        .execute()
    )
    return _row_to_response(refreshed.data)


@router.delete("/{location_id}", status_code=204)
async def delete_saved_location(
    location_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    existing = (
        sb.table("saved_locations")
        .select("id")
        .eq("id", str(location_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="저장 장소를 찾을 수 없습니다")
    sb.table("saved_locations").delete().eq("id", str(location_id)).execute()
