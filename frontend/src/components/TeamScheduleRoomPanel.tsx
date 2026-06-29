"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TeamMilestonePanel } from "@/components/TeamMilestonePanel";
import { TeamScheduleMonthView } from "@/components/TeamScheduleMonthView";
import { TeamScheduleWeekGrid } from "@/components/TeamScheduleWeekGrid";
import { api } from "@/lib/api";
import { CalendarDays, Table2 } from "lucide-react";

interface TeamScheduleRoomPanelProps {
  roomId: string;
  readOnly?: boolean;
}

/** 팀 일정방 — 월간 메모 공유 + 주간 가능 시간표 */
export function TeamScheduleRoomPanel({ roomId, readOnly = false }: TeamScheduleRoomPanelProps) {
  const [tab, setTab] = useState<"month" | "week">("month");
  const [myUserId, setMyUserId] = useState<string>();

  useEffect(() => {
    api.profiles.me().then((p) => setMyUserId(p.id)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <TeamMilestonePanel roomId={roomId} readOnly={readOnly} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("month")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium",
            tab === "month" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
          )}
        >
          <CalendarDays className="h-4 w-4" /> 월간 일정
        </button>
        <button
          type="button"
          onClick={() => setTab("week")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium",
            tab === "week" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
          )}
        >
          <Table2 className="h-4 w-4" /> 주간 가능 시간
        </button>
      </div>

      {tab === "month" ? (
        <TeamScheduleMonthView roomId={roomId} myUserId={myUserId} readOnly={readOnly} />
      ) : (
        <TeamScheduleWeekGrid roomId={roomId} readOnly={readOnly} />
      )}
    </div>
  );
}
