import httpx

from app.config import settings
from app.models.schemas import TravelTimeResponse


async def get_travel_time(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> TravelTimeResponse:
    if not settings.kakao_rest_api_key:
        # MVP fallback: straight-line estimate
        import math

        R = 6371000
        phi1, phi2 = math.radians(origin_lat), math.radians(dest_lat)
        dphi = math.radians(dest_lat - origin_lat)
        dlambda = math.radians(dest_lng - origin_lng)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        distance = int(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))
        duration = max(5, int(distance / 500))  # ~30 km/h urban avg
        return TravelTimeResponse(
            duration_minutes=duration,
            distance_meters=distance,
            route_summary=f"약 {duration}분 (직선 거리 기준 추정)",
        )

    url = "https://apis-navi.kakaomobility.com/v1/directions"
    params = {
        "origin": f"{origin_lng},{origin_lat}",
        "destination": f"{dest_lng},{dest_lat}",
        "priority": "RECOMMEND",
    }
    headers = {"Authorization": f"KakaoAK {settings.kakao_rest_api_key}"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, headers=headers, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()

    routes = data.get("routes", [])
    if not routes:
        raise ValueError("경로를 찾을 수 없습니다")

    route = routes[0]
    summary = route.get("summary", {})
    duration_sec = summary.get("duration", 0)
    distance_m = summary.get("distance", 0)
    duration_min = max(1, duration_sec // 60)

    return TravelTimeResponse(
        duration_minutes=duration_min,
        distance_meters=distance_m,
        route_summary=f"약 {duration_min}분 · {(distance_m / 1000):.1f}km",
    )
