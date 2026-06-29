"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { api, TeamScheduleWeekBoard } from "@/lib/api";
import {
  formatHourLabel,
  getWeekDates,
  getWeekStartMonday,
  parseDateKey,
  slotKey,
  TEAM_SCHEDULE_HOURS,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/team-schedule-utils";

interface TeamScheduleWeekGridProps {
  roomId: string;
  readOnly?: boolean;
}

export function TeamScheduleWeekGrid({ roomId, readOnly = false }: TeamScheduleWeekGridProps) {
  const [weekStart, setWeekStart] = useState(() => toDateKey(getWeekStartMonday()));
  const [board, setBoard] = useState<TeamScheduleWeekBoard | null>(null);
  const [mySlots, setMySlots] = useState<Record<string, boolean>>({});
  const [otherTimes, setOtherTimes] = useState("");
  const [saving, setSaving] = useState(false);

  const weekDates = useMemo(() => getWeekDates(parseDateKey(weekStart)), [weekStart]);

  const reload = useCallback(async () => {
    const data = await api.teamSchedule.getWeekBoard(roomId, weekStart);
    setBoard(data);
    const mine = data.members.find((m) => m.is_me);
    setMySlots(mine?.slots ?? {});
    setOtherTimes(mine?.other_times ?? "");
  }, [roomId, weekStart]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const shiftWeek = (delta: number) => {
    const d = parseDateKey(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(toDateKey(d));
  };

  const toggleSlot = (dateKey: string, hour: number) => {
    if (readOnly) return;
    const key = slotKey(dateKey, hour);
    setMySlots((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const updated = await api.teamSchedule.saveMyWeek(roomId, weekStart, mySlots, otherTimes);
      setBoard(updated);
      const mine = updated.members.find((m) => m.is_me);
      setMySlots(mine?.slots ?? {});
      setOtherTimes(mine?.other_times ?? "");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const weekLabel = `${weekDates[0]!.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} – ${weekDates[6]!.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`;

  /** 저장 전 내 선택도 반영한 슬롯별 가능 인원 */
  const effectiveCounts = useMemo(() => {
    if (!board) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const m of board.members) {
      const slots = m.is_me ? mySlots : m.slots;
      for (const [key, on] of Object.entries(slots)) {
        if (on) counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  }, [board, mySlots]);

  const maxTeamCount = useMemo(() => {
    const values = Object.values(effectiveCounts);
    return Math.max(values.length ? Math.max(...values) : 0, board?.members.length ?? 1, 1);
  }, [effectiveCounts, board?.members.length]);

  const heatStyle = (count: number, mine: boolean) => {
    if (count <= 0 && !mine) {
      return "border-border bg-surface/40 text-muted hover:border-primary/30";
    }
    return cn("border-primary/40 text-primary font-semibold", mine && "ring-1 ring-primary/30");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface"
          >
            ←
          </button>
          <h3 className="text-sm font-semibold text-foreground">{weekLabel}</h3>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface"
          >
            →
          </button>
        </div>
        <p className="text-xs text-muted">
          08:00 – 19:00 · 클릭 on/off · 진할수록 가능 인원 많음
        </p>
      </div>

      {maxTeamCount > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted">
          <span>가능 인원</span>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-1.5 py-0.5"
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-primary) ${Math.min(45, 12 + (n / maxTeamCount) * 33)}%, transparent)`,
              }}
            >
              {n === 3 ? `${n}명+` : `${n}명`}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card p-2 text-left font-medium text-muted">시간</th>
              {weekDates.map((date, i) => (
                <th key={toDateKey(date)} className="p-2 text-center font-medium text-muted">
                  <div>{WEEKDAY_LABELS[date.getDay()]}</div>
                  <div className="text-foreground">{date.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEAM_SCHEDULE_HOURS.map((hour) => (
              <tr key={hour} className="border-t border-border/60">
                <td className="sticky left-0 z-10 bg-card p-2 font-medium text-muted whitespace-nowrap">
                  {formatHourLabel(hour)}
                </td>
                {weekDates.map((date) => {
                  const dateKey = toDateKey(date);
                  const key = slotKey(dateKey, hour);
                  const on = Boolean(mySlots[key]);
                  const teamCount = effectiveCounts[key] ?? 0;
                  const ratio = teamCount / maxTeamCount;
                  const heatAlpha =
                    teamCount > 0 ? Math.min(0.55, 0.14 + ratio * 0.4) : 0;
                  return (
                    <td key={key} className="p-1">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleSlot(dateKey, hour)}
                        className={cn(
                          "flex h-9 w-full flex-col items-center justify-center rounded-lg border text-[10px] transition-colors",
                          heatStyle(teamCount, on)
                        )}
                        style={
                          teamCount > 0
                            ? {
                                backgroundColor: `color-mix(in srgb, var(--color-primary) ${Math.round(heatAlpha * 100)}%, transparent)`,
                              }
                            : undefined
                        }
                        title={teamCount > 0 ? `${teamCount}명 가능` : on ? "내 가능 시간" : undefined}
                      >
                        {on ? "✓" : teamCount > 0 ? "●" : ""}
                        {teamCount > 0 && (
                          <span className="mt-0.5 text-primary">{teamCount}명</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-foreground">기타 가능 시간</label>
        <textarea
          value={otherTimes}
          onChange={(e) => setOtherTimes(e.target.value)}
          disabled={readOnly}
          rows={2}
          placeholder="예: 화요일 07:30, 금요일 20시 이후"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
        {!readOnly && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "저장 중…" : "내 가능 시간 저장"}
          </Button>
        )}
      </div>

      {board && board.members.some((m) => !m.is_me && m.other_times) && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted">팀원 기타 시간</p>
          <ul className="mt-2 space-y-1">
            {board.members
              .filter((m) => !m.is_me && m.other_times)
              .map((m) => (
                <li key={m.user_id} className="text-sm">
                  <span className="font-medium text-foreground">{m.display_name}</span>
                  <span className="text-muted"> — {m.other_times}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
