"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppointmentOutputPanel } from "@/components/AppointmentOutputPanel";
import { api, Appointment, MeetingSettlement, Place } from "@/lib/api";

interface RoomOutputBannerProps {
  roomId: string;
  appointments: Appointment[];
}

/** 방 상단: 최근 확정 약속의 지도·이동시간·모임 결산 출력 */
export function RoomOutputBanner({ roomId, appointments }: RoomOutputBannerProps) {
  const confirmed = appointments
    .filter((a) => a.status === "confirmed")
    .sort((a, b) => (b.confirmed_date ?? "").localeCompare(a.confirmed_date ?? ""))[0];

  const [place, setPlace] = useState<Place | null>(null);
  const [settlement, setSettlement] = useState<MeetingSettlement | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number; name?: string } | undefined>();

  useEffect(() => {
    api.profiles.me().then((p) => {
      if (p.home_lat != null && p.home_lng != null) {
        setOrigin({ lat: p.home_lat, lng: p.home_lng, name: p.display_name });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!confirmed) return;
    if (confirmed.confirmed_place_id) {
      api.places.get(confirmed.confirmed_place_id).then(setPlace).catch(() => {});
    }
    api.appointments.settlement(confirmed.id).then(setSettlement).catch(() => {});
  }, [confirmed?.id, confirmed?.confirmed_place_id]);

  if (!confirmed) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">다가오는 확정 약속</h2>
        <Link
          href={`/groups/${roomId}/appointments/${confirmed.id}`}
          className="text-sm text-primary hover:underline"
        >
          상세 보기
        </Link>
      </div>
      <AppointmentOutputPanel
        appointment={confirmed}
        place={place}
        settlement={settlement}
        origin={origin}
      />
    </div>
  );
}
