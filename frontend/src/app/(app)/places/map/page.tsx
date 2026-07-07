"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlaceReviewsModal } from "@/components/PlaceReviewsModal";
import { api, Place, TIER_LABELS } from "@/lib/api";
import {
  placesMapSplitGridHeight,
  placesMapViewportHeight,
} from "@/lib/map-viewport-height";
import { cn } from "@/lib/utils";
import { ArrowLeft, MapPin, MessageSquare } from "lucide-react";

function SelectedPlaceCard({
  place,
  onOpenReviews,
  className,
}: {
  place: Place;
  onOpenReviews: () => void;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="tier" tier={place.tier}>
            {TIER_LABELS[place.tier]}
          </Badge>
          <CardTitle className="mt-2">{place.name}</CardTitle>
          <CardDescription>{place.address}</CardDescription>
          {place.past_travel_hint && (
            <p className="mt-2 text-xs text-accent">{place.past_travel_hint}</p>
          )}
        </div>
        <KakaoMapLinks
          place={{
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            kakao_place_id: place.kakao_place_id,
          }}
        />
      </div>
      <Button size="sm" variant="secondary" className="mt-4" onClick={onOpenReviews}>
        <MessageSquare className="h-3.5 w-3.5" /> 리뷰 보기
      </Button>
    </Card>
  );
}

export default function PlacesMapPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewsModal, setReviewsModal] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);

  useEffect(() => {
    api.places.list().then(setPlaces).catch(() => {});
  }, []);

  const markers = useMemo(
    () =>
      places.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
      })),
    [places]
  );

  const selected = places.find((p) => p.id === selectedId);
  const mobileMapHeight = placesMapViewportHeight(Boolean(selected));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:max-w-none lg:px-6">
      <Link
        href="/places"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 맛집 목록
      </Link>

      <p className="mb-6 text-sm text-muted">
        Kakao Maps SDK · clusterer(다중 마커) · 카카오맵 길찾기 연동
      </p>

      <div
        className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-stretch lg:gap-6"
        style={
          {
            "--map-mobile-h": mobileMapHeight,
            "--map-split-h": placesMapSplitGridHeight(),
          } as React.CSSProperties
        }
      >
        <div className="min-h-0 h-[var(--map-mobile-h)] lg:h-[var(--map-split-h)]">
          <KakaoMap
            markers={markers}
            selectedMarkerId={selectedId}
            onMarkerClick={setSelectedId}
            height="100%"
            className="h-full min-h-0"
            useClusterer
          />
        </div>

        <aside className="mt-6 flex min-h-0 flex-col gap-3 lg:mt-0 lg:overflow-y-auto lg:h-[var(--map-split-h)]">
          {selected && (
            <SelectedPlaceCard
              place={selected}
              className="hidden lg:block"
              onOpenReviews={() =>
                setReviewsModal({ placeId: selected.id, placeName: selected.name })
              }
            />
          )}

          {places.length > 0 && (
            <div className="hidden min-h-0 flex-1 flex-col gap-2 lg:flex">
              <p className="text-sm font-semibold text-foreground">장소 목록</p>
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {places.map((place) => {
                  const active = place.id === selectedId;
                  return (
                    <li key={place.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(place.id)}
                        className={cn(
                          "w-full rounded-xl border p-3 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="tier" tier={place.tier}>
                            {TIER_LABELS[place.tier]}
                          </Badge>
                          {active && (
                            <span className="text-xs font-medium text-primary">선택됨</span>
                          )}
                        </div>
                        <p className="mt-1.5 font-medium text-foreground">{place.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{place.address}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {selected && (
        <SelectedPlaceCard
          place={selected}
          className="mt-6 lg:hidden"
          onOpenReviews={() =>
            setReviewsModal({ placeId: selected.id, placeName: selected.name })
          }
        />
      )}

      {places.length === 0 && (
        <div className="mt-8 text-center text-muted">
          <MapPin className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-2">표시할 장소가 없습니다</p>
        </div>
      )}

      <PlaceReviewsModal
        open={Boolean(reviewsModal)}
        placeId={reviewsModal?.placeId ?? null}
        placeName={reviewsModal?.placeName}
        onClose={() => setReviewsModal(null)}
      />
    </div>
  );
}
