import {
  kakaoDirectionsByCarUrl,
  kakaoDirectionsToUrl,
  kakaoMapViewByPlaceId,
  kakaoMapViewUrl,
  type KakaoLatLng,
} from "@/lib/kakao-map";

interface KakaoMapLinksProps {
  place: KakaoLatLng & { kakao_place_id?: string };
  /** 출발지(집 등) — 있으면 자동차 길찾기 링크 추가 */
  origin?: KakaoLatLng;
  className?: string;
}

export function KakaoMapLinks({ place, origin, className = "" }: KakaoMapLinksProps) {
  const mapUrl = place.kakao_place_id
    ? kakaoMapViewByPlaceId(place.kakao_place_id)
    : kakaoMapViewUrl(place);

  const directionsUrl = origin
    ? kakaoDirectionsByCarUrl(origin, place)
    : kakaoDirectionsToUrl(place);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-primary hover:underline"
      >
        카카오맵에서 보기
      </a>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-accent hover:underline"
      >
        길찾기
      </a>
    </div>
  );
}
