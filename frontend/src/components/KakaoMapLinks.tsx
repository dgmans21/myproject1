"use client";

import {
  kakaoDirectionsByCarUrl,
  kakaoDirectionsToUrl,
  kakaoMapViewByPlaceId,
  kakaoMapViewUrl,
  type KakaoLatLng,
} from "@/lib/kakao-map";
import {
  resolveTravelOrigin,
  useDepartureOriginOptional,
} from "@/lib/departure-origin-context";

interface KakaoMapLinksProps {
  place: KakaoLatLng & { kakao_place_id?: string };
  /** 출발지 — 없으면 Context 활성 출발지 사용 */
  origin?: KakaoLatLng;
  className?: string;
}

export function KakaoMapLinks({ place, origin, className = "" }: KakaoMapLinksProps) {
  const ctx = useDepartureOriginOptional();
  const resolved = resolveTravelOrigin(origin, ctx);

  const mapUrl = place.kakao_place_id
    ? kakaoMapViewByPlaceId(place.kakao_place_id)
    : kakaoMapViewUrl(place);

  const directionsUrl = resolved
    ? kakaoDirectionsByCarUrl(
        { ...resolved, name: resolved.name ?? "출발" },
        place
      )
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
