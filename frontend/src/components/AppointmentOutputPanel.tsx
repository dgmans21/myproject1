"use client";

import { useState } from "react";
import { DepartureOriginChip } from "@/components/DepartureOriginPicker";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { MeetingSettlementWidget } from "@/components/MeetingSettlementWidget";
import { TravelTimeNudge } from "@/components/TravelTimeNudge";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Appointment, MeetingSettlement, Place } from "@/lib/api";
import { TIER_LABELS } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import { Check, ChevronDown, ChevronUp, MapPin } from "lucide-react";

interface AppointmentOutputPanelProps {
  appointment: Appointment;
  place: Place | null;
  settlement: MeetingSettlement | null;
}

/** 약속 확정 후 출력: 일정 · 지도 · 이동시간 · 모임 결산 */
export function AppointmentOutputPanel({
  appointment,
  place,
  settlement,
}: AppointmentOutputPanelProps) {
  const [placeOpen, setPlaceOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3">
          <Check className="h-6 w-6 text-accent shrink-0 mt-0.5" />
          <div>
            <CardTitle>약속 확정</CardTitle>
            <p className="mt-1 text-sm text-foreground font-medium">
              {appointment.confirmed_date && formatDate(appointment.confirmed_date)}{" "}
              {appointment.confirmed_time && formatTime(appointment.confirmed_time)}
            </p>
            {appointment.description && (
              <p className="mt-1 text-sm text-muted">{appointment.description}</p>
            )}
          </div>
        </div>
      </Card>

      {place && (
        <Card>
          <button
            type="button"
            className="flex w-full items-start justify-between gap-3 text-left"
            onClick={() => setPlaceOpen((v) => !v)}
            aria-expanded={placeOpen}
          >
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                확정 장소
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="tier" tier={place.tier}>
                  {TIER_LABELS[place.tier]}
                </Badge>
                <span className="font-semibold text-foreground">{place.name}</span>
              </div>
              {!placeOpen && (
                <p className="mt-1 text-sm text-muted line-clamp-1">{place.address}</p>
              )}
            </div>
            {placeOpen ? (
              <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted" />
            ) : (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted" />
            )}
          </button>

          {placeOpen && (
            <div className="mt-3">
              <p className="text-sm text-muted">{place.address}</p>
              <DepartureOriginChip className="mt-3" />
              <TravelTimeNudge
                className="mt-2"
                place={place}
                appointmentId={appointment.id}
              />
              <KakaoMapLinks className="mt-2" place={place} />
              <div className="mt-4">
                <KakaoMap
                  markers={[{ id: place.id, name: place.name, lat: place.lat, lng: place.lng }]}
                  center={{ lat: place.lat, lng: place.lng }}
                  level={3}
                  height={320}
                  useClusterer={false}
                />
              </div>
            </div>
          )}
        </Card>
      )}

      <MeetingSettlementWidget settlement={settlement} />
    </div>
  );
}
