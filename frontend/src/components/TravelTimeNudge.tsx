"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { api, Place, TravelTimeResponse } from "@/lib/api";

interface TravelTimeNudgeProps {
  place: Place;
  /** 출발지(집) — 있으면 Kakao Mobility 기준 예상 시간도 조회 */
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
  const [live, setLive] = useState<TravelTimeResponse | null>(null);

  useEffect(() => {
    if (!origin) return;
    api.places
      .travelTime({
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        dest_lat: place.lat,
        dest_lng: place.lng,
        place_id: place.id,
        appointment_id: appointmentId,
      })
      .then(setLive)
      .catch(() => {});
  }, [place.id, place.lat, place.lng, origin?.lat, origin?.lng, appointmentId]);

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
      {!place.past_travel_hint && !live && origin && (
        <p className="text-muted">이동 시간 계산 중...</p>
      )}
    </div>
  );
}
