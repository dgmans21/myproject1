"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { api, Place, TravelTimeResponse } from "@/lib/api";
import {
  resolveTravelOrigin,
  useDepartureOriginOptional,
} from "@/lib/departure-origin-context";

interface TravelTimeNudgeProps {
  place: Place;
  /** 출발지 — 없으면 Context 활성 출발지 사용 */
  origin?: { lat: number; lng: number };
  appointmentId?: string;
  className?: string;
}

export function TravelTimeNudge({
  place,
  origin,
  appointmentId,
  className = "",
}: TravelTimeNudgeProps) {
  const ctx = useDepartureOriginOptional();
  const resolved = resolveTravelOrigin(origin, ctx);
  const [live, setLive] = useState<TravelTimeResponse | null>(null);

  useEffect(() => {
    if (!resolved) return;
    api.places
      .travelTime({
        origin_lat: resolved.lat,
        origin_lng: resolved.lng,
        dest_lat: place.lat,
        dest_lng: place.lng,
        place_id: place.id,
        appointment_id: appointmentId,
      })
      .then(setLive)
      .catch(() => {});
  }, [place.id, place.lat, place.lng, resolved?.lat, resolved?.lng, appointmentId]);

  return (
    <div className={`space-y-1 text-xs ${className}`}>
      {place.past_travel_hint && (
        <p className="flex items-center gap-1 text-accent">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {place.past_travel_hint}
        </p>
      )}
      {live && (
        <p className="text-muted">
          출발지 기준 예상 · {live.route_summary}
        </p>
      )}
      {!place.past_travel_hint && !live && resolved && (
        <p className="text-muted">이동 시간 계산 중...</p>
      )}
    </div>
  );
}
