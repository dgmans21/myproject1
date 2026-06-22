"use client";

import { KakaoMap } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { MeetingSettlementWidget } from "@/components/MeetingSettlementWidget";
import { TravelTimeNudge } from "@/components/TravelTimeNudge";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Appointment, MeetingSettlement, Place } from "@/lib/api";
import { TIER_LABELS } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import { Check, MapPin } from "lucide-react";

interface AppointmentOutputPanelProps {
  appointment: Appointment;
  place: Place | null;
  settlement: MeetingSettlement | null;
  origin?: { lat: number; lng: number; name?: string };
}

/** 약속 확정 후 출력: 일정 · 지도 · 이동시간 · 모임 결산 */
export function AppointmentOutputPanel({
  appointment,
  place,
  settlement,
  origin,
}: AppointmentOutputPanelProps) {
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
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            확정 장소
          </CardTitle>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="tier" tier={place.tier}>
              {TIER_LABELS[place.tier]}
            </Badge>
            <span className="font-semibold text-foreground">{place.name}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{place.address}</p>
          <TravelTimeNudge
            className="mt-3"
            place={place}
            origin={origin}
            appointmentId={appointment.id}
          />
          <KakaoMapLinks
            className="mt-2"
            place={place}
            origin={origin ? { ...origin, name: origin.name ?? "출발" } : undefined}
          />
          <div className="mt-4">
            <KakaoMap
              markers={[{ id: place.id, name: place.name, lat: place.lat, lng: place.lng }]}
              center={{ lat: place.lat, lng: place.lng }}
              level={3}
              height={320}
              useClusterer={false}
            />
          </div>
        </Card>
      )}

      <MeetingSettlementWidget settlement={settlement} />
    </div>
  );
}
