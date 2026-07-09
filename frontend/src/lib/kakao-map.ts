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
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services,clusterer&autoload=false`;
}

let sdkLoadPromise: Promise<void> | null = null;

function resetSdkLoadPromise() {
  sdkLoadPromise = null;
}

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
      // fetch()는 CORS로 막히므로 공식 가이드대로 script 태그만 사용
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = () => {
        if (!window.kakao?.maps) {
          resetSdkLoadPromise();
          reject(
            new Error(
              `Kakao SDK 초기화 실패. JavaScript 키(REST 아님)와 웹 도메인(${window.location.origin})·기본 도메인 선택을 확인하세요.`
            )
          );
          return;
        }
        window.kakao.maps.load(() => resolve());
      };
      script.onerror = () => {
        resetSdkLoadPromise();
        reject(
          new Error(
            [
              "Kakao Maps SDK 로드 실패. 아래를 순서대로 확인하세요.",
              "① 앱 설정 → 앱 키 → JavaScript 키 값을 .env.local에 넣었는지 (REST API 키 아님)",
              "② JavaScript 키 상세 → JavaScript SDK 도메인에 http://localhost:3000 등록",
              "③ 제품 설정 → 카카오맵 → 상태를 ON(활성화) — 이 단계를 빠뜨리면 지도가 안 뜹니다",
              `④ 브라우저 주소가 등록 도메인과 일치: ${window.location.origin}`,
            ].join(" ")
          )
        );
      };
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

export interface KakaoPoiResult {
  id: string;
  name: string;
  address: string;
  roadAddress?: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
}

export interface KeywordSearchPage {
  pois: KakaoPoiResult[];
  currentPage: number;
  isLast: boolean;
  hasNextPage: boolean;
}

export interface KeywordSearchOptions {
  center?: KakaoLatLng;
  page?: number;
  radius?: number;
}

function mapPoiRow(row: {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
  x: string;
  y: string;
  distance?: string;
}): KakaoPoiResult {
  return {
    id: row.id,
    name: row.place_name,
    address: row.road_address_name || row.address_name,
    roadAddress: row.road_address_name || undefined,
    lat: parseFloat(row.y),
    lng: parseFloat(row.x),
    distanceMeters: row.distance ? parseInt(row.distance, 10) : undefined,
  };
}

/** services.Places — 키워드/상호/권역 POI 검색 */
export async function keywordSearch(
  query: string,
  options?: KeywordSearchOptions
): Promise<KeywordSearchPage> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { pois: [], currentPage: 1, isLast: true, hasNextPage: false };
  }

  await loadKakaoMapSdk();
  const page = options?.page ?? 1;

  return new Promise((resolve, reject) => {
    const places = new window.kakao!.maps.services.Places();
    const searchOptions: { location?: unknown; radius?: number; sort?: string } = {
      sort: options?.center ? "distance" : undefined,
    };
    if (options?.center) {
      searchOptions.location = new window.kakao!.maps.LatLng(
        options.center.lat,
        options.center.lng
      );
      searchOptions.radius = options.radius ?? 20000;
    }

    const runSearch = (targetPage: number) => {
      places.keywordSearch(
        trimmed,
        (data, status, pagination) => {
          const ok = status === window.kakao!.maps.services.Status.OK;
          const zero = status === window.kakao!.maps.services.Status.ZERO_RESULT;

          if (!ok && !zero) {
            reject(new Error("장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요."));
            return;
          }

          if (targetPage !== pagination.current) {
            if (pagination.hasNextPage) {
              pagination.gotoPage(targetPage);
            } else {
              resolve({
                pois: [],
                currentPage: targetPage,
                isLast: true,
                hasNextPage: false,
              });
            }
            return;
          }

          const pois = (data ?? []).map(mapPoiRow);
          resolve({
            pois,
            currentPage: pagination.current,
            isLast: pagination.current >= pagination.last,
            hasNextPage: pagination.hasNextPage,
          });
        },
        searchOptions
      );
    };

    if (page === 1) {
      runSearch(1);
    } else {
      runSearch(page);
    }
  });
}

/** 주소에서 공개 거주지(시/구) 추출 */
export function deriveResidenceFromAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return "";

  const metro = trimmed.match(
    /^(서울|부산|대구|인천|광주|대전|울산|세종|제주)(?:특별시|광역시|특별자치시|특별자치도)?\s*([^\s]+(?:구|군))/
  );
  if (metro) {
    const city = metro[1] === "세종" ? "세종" : metro[1];
    return `${city} ${metro[2]}`;
  }

  const province = trimmed.match(/^([가-힣]+도)\s+([^\s]+(?:시|군))/);
  if (province) return `${province[1]} ${province[2]}`;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
  return trimmed.slice(0, 40);
}

export const POI_MARKER_PREFIX = "kakao-poi:";
export function poiMarkerId(kakaoPlaceId: string): string {
  return `${POI_MARKER_PREFIX}${kakaoPlaceId}`;
}
export function isPoiMarkerId(id: string): boolean {
  return id.startsWith(POI_MARKER_PREFIX);
}
export function kakaoPlaceIdFromMarkerId(id: string): string {
  return id.slice(POI_MARKER_PREFIX.length);
}
