import httpx

from app.config import settings
from app.models.schemas import RoutePoint, TravelRouteResponse, TravelTimeResponse


def _straight_line_estimate(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> TravelTimeResponse:
    import math

    R = 6371000
    phi1, phi2 = math.radians(origin_lat), math.radians(dest_lat)
    dphi = math.radians(dest_lat - origin_lat)
    dlambda = math.radians(dest_lng - origin_lng)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    distance = int(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))
    duration = max(5, int(distance / 500))
    return TravelTimeResponse(
        duration_minutes=duration,
        distance_meters=distance,
        route_summary=f"약 {duration}분 (직선 거리 기준 추정)",
    )


def _extract_polyline(route: dict) -> list[RoutePoint]:
    points: list[RoutePoint] = []
    for section in route.get("sections", []):
        for road in section.get("roads", []):
            vertexes = road.get("vertexes", [])
            for i in range(0, len(vertexes) - 1, 2):
                lng, lat = vertexes[i], vertexes[i + 1]
                points.append(RoutePoint(lat=float(lat), lng=float(lng)))
    return points


async def _fetch_directions(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> dict:
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
        return resp.json()


def _route_to_travel(route: dict) -> TravelTimeResponse:
    summary = route.get("summary", {})
    duration_sec = summary.get("duration", 0)
    distance_m = summary.get("distance", 0)
    duration_min = max(1, duration_sec // 60)
    return TravelTimeResponse(
        duration_minutes=duration_min,
        distance_meters=distance_m,
        route_summary=f"약 {duration_min}분 · {(distance_m / 1000):.1f}km",
    )


async def get_travel_time(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> TravelTimeResponse:
    if not settings.kakao_rest_api_key:
        return _straight_line_estimate(origin_lat, origin_lng, dest_lat, dest_lng)

    data = await _fetch_directions(origin_lat, origin_lng, dest_lat, dest_lng)
    routes = data.get("routes", [])
    if not routes:
        raise ValueError("경로를 찾을 수 없습니다")
    return _route_to_travel(routes[0])


async def get_travel_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> TravelRouteResponse:
    if not settings.kakao_rest_api_key:
        base = _straight_line_estimate(origin_lat, origin_lng, dest_lat, dest_lng)
        return TravelRouteResponse(
            duration_minutes=base.duration_minutes,
            distance_meters=base.distance_meters,
            route_summary=base.route_summary,
            polyline=[
                RoutePoint(lat=origin_lat, lng=origin_lng),
                RoutePoint(lat=dest_lat, lng=dest_lng),
            ],
        )

    data = await _fetch_directions(origin_lat, origin_lng, dest_lat, dest_lng)
    routes = data.get("routes", [])
    if not routes:
        raise ValueError("경로를 찾을 수 없습니다")

    route = routes[0]
    base = _route_to_travel(route)
    return TravelRouteResponse(
        duration_minutes=base.duration_minutes,
        distance_meters=base.distance_meters,
        route_summary=base.route_summary,
        polyline=_extract_polyline(route),
    )
