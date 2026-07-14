"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DepartureOriginChip } from "@/components/DepartureOriginPicker";
import { KakaoMap, KakaoMapPolyline } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { TravelTimeNudge } from "@/components/TravelTimeNudge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api, Place, TIER_LABELS } from "@/lib/api";
import { ENABLE_DEPARTURE_ROUTE_LINES } from "@/lib/departure-route-config";
import { resolveTravelOrigin, useDepartureOriginOptional } from "@/lib/departure-origin-context";
import {
  placeVoteMapViewportHeight,
  placeVoteSplitGridHeight,
} from "@/lib/map-viewport-height";
import { placesMapPickHref } from "@/lib/places-map-pick";
import { useIsMobileLayout } from "@/lib/use-mobile-layout";
import { cn } from "@/lib/utils";
import { MapPin, Plus } from "lucide-react";

interface PlaceVotePanelProps {
  roomId: string;
  appointmentId: string;
  groupId: string;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}

const ROUTE_COLORS = ["#6366F1", "#0EA5E9", "#F59E0B", "#10B981", "#EC4899"];

function PlaceCandidateButton({
  place,
  active,
  appointmentId,
  onSelect,
}: {
  place: Place;
  active: boolean;
  appointmentId: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-2xl border p-4 text-left transition-all",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="tier" tier={place.tier}>
          {TIER_LABELS[place.tier]}
        </Badge>
        {active && <span className="text-xs font-medium text-primary">선택됨</span>}
      </div>
      <p className="mt-2 font-semibold text-foreground">{place.name}</p>
      <p className="text-xs text-muted">{place.address}</p>
      <TravelTimeNudge
        className="mt-2"
        place={place}
        appointmentId={appointmentId}
      />
      <KakaoMapLinks className="mt-2" place={place} />
    </button>
  );
}

export function PlaceVotePanel({
  roomId,
  appointmentId,
  groupId,
  selectedPlaceId,
  onSelectPlace,
}: PlaceVotePanelProps) {
  const isMobile = useIsMobileLayout();
  const departureCtx = useDepartureOriginOptional();
  const [places, setPlaces] = useState<Place[]>([]);
  const [routePolylines, setRoutePolylines] = useState<KakaoMapPolyline[]>([]);

  const returnPath = `/groups/${groupId}/appointments/${appointmentId}`;
  const pickMapHref = placesMapPickHref({
    roomId,
    appointmentId,
    returnPath,
  });

  useEffect(() => {
    api.places.list(roomId).then(setPlaces).catch(() => {});
  }, [roomId]);

  const origin = resolveTravelOrigin(undefined, departureCtx);

  /*
   * 출발지→후보 경로선 (카카오모빌리티 /places/travel-route).
   * API 할당량 절약을 위해 ENABLE_DEPARTURE_ROUTE_LINES=false 기본.
   * true로 바꾸면 선택된 후보 포함 모든 후보에 경로선을 그립니다.
   */
  useEffect(() => {
    if (!ENABLE_DEPARTURE_ROUTE_LINES || !origin || places.length === 0) {
      setRoutePolylines([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      const lines: KakaoMapPolyline[] = [];
      await Promise.all(
        places.map(async (place, index) => {
          try {
            const route = await api.places.travelRoute({
              origin_lat: origin.lat,
              origin_lng: origin.lng,
              dest_lat: place.lat,
              dest_lng: place.lng,
              place_id: place.id,
              appointment_id: appointmentId,
            });
            if (route.polyline.length >= 2) {
              lines.push({
                id: `route-${place.id}`,
                points: route.polyline,
                strokeColor: ROUTE_COLORS[index % ROUTE_COLORS.length],
                strokeWeight: place.id === selectedPlaceId ? 5 : 3,
                strokeOpacity: place.id === selectedPlaceId ? 0.9 : 0.45,
              });
            }
          } catch {
            /* ignore per-candidate route failures */
          }
        })
      );
      if (!cancelled) setRoutePolylines(lines);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    origin?.lat,
    origin?.lng,
    places,
    appointmentId,
    selectedPlaceId,
  ]);

  const markers = useMemo(() => {
    const candidateMarkers = places.map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
    }));
    if (origin) {
      return [
        { id: "__origin__", name: "출발", lat: origin.lat, lng: origin.lng },
        ...candidateMarkers,
      ];
    }
    return candidateMarkers;
  }, [places, origin]);

  const mapPolylines = ENABLE_DEPARTURE_ROUTE_LINES ? routePolylines : [];

  const selected = places.find((p) => p.id === selectedPlaceId);

  if (places.length === 0) {
    return (
      <Card>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" /> 장소 후보
        </CardTitle>
        <p className="mt-2 text-sm text-muted">
          등록된 장소가 없습니다. 맛집 지도에서 후보를 추가하세요.
        </p>
        <Link href={pickMapHref} className="mt-4 inline-block">
          <Button size="sm">
            <Plus className="h-4 w-4" /> 맛집 지도에서 고르기
          </Button>
        </Link>
      </Card>
    );
  }

  const candidateList = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {places.map((place) => (
        <PlaceCandidateButton
          key={place.id}
          place={place}
          active={place.id === selectedPlaceId}
          appointmentId={appointmentId}
          onSelect={() => onSelectPlace(place.id)}
        />
      ))}
    </div>
  );

  return (
    <div
      className="space-y-4"
      style={
        {
          "--map-mobile-h": placeVoteMapViewportHeight(),
          "--map-split-h": placeVoteSplitGridHeight(),
        } as React.CSSProperties
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          후보 비교 · 출발지 기준 이동시간
          {!ENABLE_DEPARTURE_ROUTE_LINES && (
            <span className="ml-1 text-xs">(경로선은 비활성)</span>
          )}
        </p>
        <Link href={pickMapHref}>
          <Button size="sm" variant="secondary">
            <Plus className="h-3.5 w-3.5" /> 맛집 지도에서 추가
          </Button>
        </Link>
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:space-y-0">
        <Card className="flex min-h-0 flex-col lg:h-[var(--map-split-h)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">장소 후보 지도</CardTitle>
            <DepartureOriginChip />
          </div>
          <CardDescription className="mt-1">
            후보 위치를 비교하고, 출발지 기준 이동시간을 참고해 선택하세요
          </CardDescription>
          <div className="mt-4 min-h-0 flex-1 h-[var(--map-mobile-h)] lg:h-auto">
            <KakaoMap
              markers={markers}
              polylines={mapPolylines}
              selectedMarkerId={selectedPlaceId}
              onMarkerClick={(id) => {
                if (id !== "__origin__") onSelectPlace(id);
              }}
              height="100%"
              className="h-full min-h-0"
              useClusterer={markers.length > 2}
              recenterOnSelect={!isMobile}
            />
          </div>
        </Card>

        <div className="min-h-0 lg:flex lg:h-[var(--map-split-h)] lg:flex-col lg:overflow-y-auto lg:pr-1">
          <p className="mb-2 hidden text-sm font-semibold text-foreground lg:block">
            장소 후보
          </p>
          {candidateList}
        </div>
      </div>

      {selected && (
        <p className="text-sm text-muted">
          확정 시 선택 장소: <strong className="text-foreground">{selected.name}</strong>
        </p>
      )}
    </div>
  );
}
