import type { Place } from "@/lib/api";
import { PLACES_MAP_RADIUS_KM } from "@/lib/places-map-config";

export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** kakao_place_id → Place 맵 (이름 매칭 금지, ID만 사용) */
export function buildPlaceByKakaoIdMap(places: Place[]): Map<string, Place> {
  const map = new Map<string, Place>();
  for (const p of places) {
    if (p.kakao_place_id) map.set(p.kakao_place_id, p);
  }
  return map;
}

export function findPlaceByKakaoId(
  placesOrMap: Place[] | Map<string, Place>,
  kakaoPlaceId: string | undefined | null
): Place | undefined {
  if (!kakaoPlaceId) return undefined;
  if (placesOrMap instanceof Map) {
    return placesOrMap.get(kakaoPlaceId);
  }
  return placesOrMap.find((p) => p.kakao_place_id === kakaoPlaceId);
}

export function filterPlacesWithinRadius(
  places: Place[],
  center: { lat: number; lng: number },
  radiusKm: number = PLACES_MAP_RADIUS_KM
): Place[] {
  return places
    .filter((p) => haversineDistanceKm(center, { lat: p.lat, lng: p.lng }) <= radiusKm)
    .sort(
      (a, b) =>
        haversineDistanceKm(center, { lat: a.lat, lng: a.lng }) -
        haversineDistanceKm(center, { lat: b.lat, lng: b.lng })
    );
}
