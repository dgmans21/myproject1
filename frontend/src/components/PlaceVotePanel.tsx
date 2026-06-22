"use client";

import { useEffect, useMemo, useState } from "react";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { TravelTimeNudge } from "@/components/TravelTimeNudge";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api, Place, TIER_LABELS } from "@/lib/api";
import { MapPin } from "lucide-react";

interface PlaceVotePanelProps {
  roomId: string;
  appointmentId: string;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  origin?: { lat: number; lng: number; name?: string };
}

export function PlaceVotePanel({
  roomId,
  appointmentId,
  selectedPlaceId,
  onSelectPlace,
  origin,
}: PlaceVotePanelProps) {
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    api.places.list(roomId).then(setPlaces).catch(() => {});
  }, [roomId]);

  const markers = useMemo(
    () => places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })),
    [places]
  );

  const selected = places.find((p) => p.id === selectedPlaceId);

  if (places.length === 0) {
    return (
      <Card>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" /> 장소 후보
        </CardTitle>
        <p className="mt-2 text-sm text-muted">
          등록된 장소가 없습니다. 맛집 탭에서 후보를 추가하세요.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="text-base">장소 후보 지도</CardTitle>
        <CardDescription className="mt-1">
          후보 장소를 지도에서 확인하고, 이동 시간을 참고해 선택하세요
        </CardDescription>
        <div className="mt-4">
          <KakaoMap
            markers={markers}
            selectedMarkerId={selectedPlaceId}
            onMarkerClick={onSelectPlace}
            height={360}
            useClusterer={markers.length > 1}
          />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {places.map((place) => {
          const active = place.id === selectedPlaceId;
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => onSelectPlace(place.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <Badge variant="tier" tier={place.tier}>
                  {TIER_LABELS[place.tier]}
                </Badge>
                {active && (
                  <span className="text-xs font-medium text-primary">선택됨</span>
                )}
              </div>
              <p className="mt-2 font-semibold text-foreground">{place.name}</p>
              <p className="text-xs text-muted">{place.address}</p>
              <TravelTimeNudge
                className="mt-2"
                place={place}
                origin={origin}
                appointmentId={appointmentId}
              />
              <KakaoMapLinks
                className="mt-2"
                place={place}
                origin={origin ? { ...origin, name: origin.name ?? "출발" } : undefined}
              />
            </button>
          );
        })}
      </div>

      {selected && (
        <p className="text-sm text-muted">
          확정 시 선택 장소: <strong className="text-foreground">{selected.name}</strong>
        </p>
      )}
    </div>
  );
}
