"""출발지 우선순위: current_departure > saved_locations(is_default) > home."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class ResolvedDeparture:
    lat: float
    lng: float
    label: str
    source: str  # current | saved | home


def _has_coords(lat: Any, lng: Any) -> bool:
    return lat is not None and lng is not None


def resolve_departure_from_profile(
    profile: dict,
    default_saved: dict | None = None,
) -> ResolvedDeparture | None:
    if _has_coords(profile.get("current_departure_lat"), profile.get("current_departure_lng")):
        return ResolvedDeparture(
            lat=float(profile["current_departure_lat"]),
            lng=float(profile["current_departure_lng"]),
            label=profile.get("current_departure_label")
            or profile.get("current_departure_address")
            or "현재 출발지",
            source="current",
        )

    if default_saved and _has_coords(default_saved.get("lat"), default_saved.get("lng")):
        return ResolvedDeparture(
            lat=float(default_saved["lat"]),
            lng=float(default_saved["lng"]),
            label=default_saved.get("label") or default_saved.get("address") or "저장 출발지",
            source="saved",
        )

    if _has_coords(profile.get("home_lat"), profile.get("home_lng")):
        return ResolvedDeparture(
            lat=float(profile["home_lat"]),
            lng=float(profile["home_lng"]),
            label=profile.get("home_address") or "집",
            source="home",
        )

    return None


def fetch_default_saved_location(sb, user_id: str) -> dict | None:
    result = (
        sb.table("saved_locations")
        .select("label, address, lat, lng")
        .eq("user_id", user_id)
        .eq("is_default", True)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    return rows[0] if rows else None


def resolve_member_departure(sb, user_id: str, profile: dict | None = None) -> ResolvedDeparture | None:
    if profile is None:
        row = sb.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
        profile = row.data or {}
    default_saved = fetch_default_saved_location(sb, user_id)
    return resolve_departure_from_profile(profile, default_saved)


def origin_label_from_profile(prof: dict) -> str:
    resolved = resolve_departure_from_profile(prof, None)
    if resolved:
        return resolved.label
    if prof.get("home_address"):
        return prof["home_address"]
    if prof.get("residence"):
        return prof["residence"]
    return "출발지 미등록"


def departure_update_fields(
    *,
    clear: bool = False,
    label: str | None = None,
    address: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    if clear:
        return {
            "current_departure_label": None,
            "current_departure_address": None,
            "current_departure_lat": None,
            "current_departure_lng": None,
            "current_departure_set_at": None,
        }
    if lat is None or lng is None:
        return {}
    return {
        "current_departure_label": (label or "").strip() or None,
        "current_departure_address": (address or "").strip() or None,
        "current_departure_lat": lat,
        "current_departure_lng": lng,
        "current_departure_set_at": datetime.now(timezone.utc).isoformat(),
    }
