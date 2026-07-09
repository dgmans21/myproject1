import type { KakaoPoiResult } from "@/lib/kakao-map";

const STORAGE_KEY = "place-register-draft";

export const PLACE_REGISTER_ADD_QUERY = "add";

export function savePlaceRegisterDraft(poi: KakaoPoiResult): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(poi));
}

export function readPlaceRegisterDraft(): KakaoPoiResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as KakaoPoiResult;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.address === "string" &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPlaceRegisterDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function placeRegisterHref(poi?: KakaoPoiResult): string {
  if (poi) savePlaceRegisterDraft(poi);
  return `/places?${PLACE_REGISTER_ADD_QUERY}=1`;
}

export type ApplyPoiToRegisterFormArgs = {
  poi: KakaoPoiResult;
  setName: (v: string) => void;
  setAddress: (v: string) => void;
  setCoords: (v: { lat: number; lng: number }) => void;
  setKakaoPlaceId: (v: string) => void;
  setSelectedPoiId: (id: string) => void;
};

export function applyPoiToRegisterForm({
  poi,
  setName,
  setAddress,
  setCoords,
  setKakaoPlaceId,
  setSelectedPoiId,
}: ApplyPoiToRegisterFormArgs): void {
  setSelectedPoiId(poi.id);
  setName(poi.name);
  setAddress(poi.address);
  setCoords({ lat: poi.lat, lng: poi.lng });
  setKakaoPlaceId(poi.id);
}
