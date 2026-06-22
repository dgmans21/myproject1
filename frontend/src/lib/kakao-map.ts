export interface KakaoMapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface KakaoLatLng {
  lat: number;
  lng: number;
  name?: string;
}

/** 지도 바로가기: /link/map/이름,위도,경도 */
export function kakaoMapViewUrl({ lat, lng, name }: KakaoLatLng): string {
  const label = encodeURIComponent(name ?? "장소");
  return `https://map.kakao.com/link/map/${label},${lat},${lng}`;
}

/** 장소ID 지도: /link/map/장소ID */
export function kakaoMapViewByPlaceId(placeId: string): string {
  return `https://map.kakao.com/link/map/${placeId}`;
}

/** 길찾기(목적지): /link/to/이름,위도,경도 */
export function kakaoDirectionsToUrl(dest: KakaoLatLng): string {
  const label = encodeURIComponent(dest.name ?? "목적지");
  return `https://map.kakao.com/link/to/${label},${dest.lat},${dest.lng}`;
}

/** 길찾기(출발→도착, 자동차): /link/by/car/... */
export function kakaoDirectionsByCarUrl(from: KakaoLatLng, to: KakaoLatLng): string {
  const fromLabel = encodeURIComponent(from.name ?? "출발");
  const toLabel = encodeURIComponent(to.name ?? "도착");
  return `https://map.kakao.com/link/by/car/${fromLabel},${from.lat},${from.lng}/${toLabel},${to.lat},${to.lng}`;
}

export function getKakaoMapSdkUrl(): string | null {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!key) return null;
  // 공식 가이드: services(주소검색·좌표변환), clusterer(다중 마커)
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services,clusterer`;
}

let sdkLoadPromise: Promise<void> | null = null;

export function loadKakaoMapSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 사용할 수 있습니다"));
  }

  const url = getKakaoMapSdkUrl();
  if (!url) {
    return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다"));
  }

  if (window.kakao?.maps) {
    return new Promise((resolve) => window.kakao!.maps.load(resolve));
  }

  if (!sdkLoadPromise) {
    sdkLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = () => {
        window.kakao!.maps.load(() => resolve());
      };
      script.onerror = () => reject(new Error("Kakao Maps SDK 로드 실패"));
      document.head.appendChild(script);
    });
  }

  return sdkLoadPromise;
}

/** services 라이브러리: 주소 → 좌표 */
export async function geocodeAddress(address: string): Promise<KakaoLatLng | null> {
  await loadKakaoMapSdk();
  return new Promise((resolve) => {
    const geocoder = new window.kakao!.maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
      if (status === window.kakao!.maps.services.Status.OK && result[0]) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
          name: result[0].address_name ?? address,
        });
      } else {
        resolve(null);
      }
    });
  });
}

export const DEFAULT_MAP_CENTER = { lat: 37.5665, lng: 126.978 };
