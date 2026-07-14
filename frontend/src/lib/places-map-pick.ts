/** 약속 장소 선택 모드 — 맛집 지도 URL 빌더 */

export const PLACES_MAP_PICK_MODE = "pick";

export type PlacesMapPickParams = {
  roomId: string;
  appointmentId: string;
  returnPath: string;
};

export function placesMapPickHref({
  roomId,
  appointmentId,
  returnPath,
}: PlacesMapPickParams): string {
  const q = new URLSearchParams({
    mode: PLACES_MAP_PICK_MODE,
    roomId,
    appointmentId,
    return: returnPath,
  });
  return `/places/map?${q.toString()}`;
}

export function parsePlacesMapPickParams(searchParams: URLSearchParams): {
  pickMode: boolean;
  roomId: string | null;
  appointmentId: string | null;
  returnPath: string | null;
} {
  return {
    pickMode: searchParams.get("mode") === PLACES_MAP_PICK_MODE,
    roomId: searchParams.get("roomId"),
    appointmentId: searchParams.get("appointmentId"),
    returnPath: searchParams.get("return"),
  };
}
