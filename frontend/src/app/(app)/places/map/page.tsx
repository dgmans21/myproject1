"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlaceReviewsModal } from "@/components/PlaceReviewsModal";
import { api, Place, TIER_LABELS } from "@/lib/api";
import { ArrowLeft, MapPin, MessageSquare } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link
          href="/places"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> 맛집 목록
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">맛집 지도</h1>
          <p className="mt-1 text-sm text-muted">
            Kakao Maps SDK · clusterer(다중 마커) · 카카오맵 길찾기 연동
          </p>
        </div>

        <KakaoMap
          markers={markers}
          selectedMarkerId={selectedId}
          onMarkerClick={setSelectedId}
          height={480}
          useClusterer
        />

        {selected && (
          <Card className="mt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="tier" tier={selected.tier}>
                  {TIER_LABELS[selected.tier]}
                </Badge>
                <CardTitle className="mt-2">{selected.name}</CardTitle>
                <CardDescription>{selected.address}</CardDescription>
                {selected.past_travel_hint && (
                  <p className="mt-2 text-xs text-accent">{selected.past_travel_hint}</p>
                )}
              </div>
              <KakaoMapLinks
                place={{
                  name: selected.name,
                  lat: selected.lat,
                  lng: selected.lng,
                  kakao_place_id: selected.kakao_place_id,
                }}
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-4"
              onClick={() =>
                setReviewsModal({ placeId: selected.id, placeName: selected.name })
              }
            >
              <MessageSquare className="h-3.5 w-3.5" /> 리뷰 보기
            </Button>
          </Card>
        )}

        {places.length === 0 && (
          <div className="mt-8 text-center text-muted">
            <MapPin className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-2">표시할 장소가 없습니다</p>
          </div>
        )}
      </main>

      <PlaceReviewsModal
        open={Boolean(reviewsModal)}
        placeId={reviewsModal?.placeId ?? null}
        placeName={reviewsModal?.placeName}
        onClose={() => setReviewsModal(null)}
      />
    </div>
  );
}
