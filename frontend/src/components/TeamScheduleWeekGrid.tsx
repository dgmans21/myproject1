"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** 1명은 아주 연하게, 2명 이상부터 점차 진하게 */
function heatMixPercent(count: number, max: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 7;
  const ratio = count / Math.max(max, 2);
  return Math.round(14 + ratio * 40);
}

type InputMode = "day" | "table";

export function TeamScheduleWeekGrid({ roomId, readOnly = false }: TeamScheduleWeekGridProps) {
  const [weekStart, setWeekStart] = useState(() => toDateKey(getWeekStartMonday()));
  const [board, setBoard] = useState<TeamScheduleWeekBoard | null>(null);
  const [mySlots, setMySlots] = useState<Record<string, boolean>>({});
  const [otherTimes, setOtherTimes] = useState("");
  const [saving, setSaving] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("day");
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1;
  });
  const paintValue = useRef<boolean | null>(null);

  const weekDates = useMemo(() => getWeekDates(parseDateKey(weekStart)), [weekStart]);
  const selectedDateKey = useMemo(
    () => toDateKey(weekDates[selectedDayIdx]!),
    [weekDates, selectedDayIdx]
  );

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

  const setSlot = useCallback((dateKey: string, hour: number, on: boolean) => {
    const key = slotKey(dateKey, hour);
    setMySlots((prev) => {
      const next = { ...prev };
      if (on) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);

  const toggleSlot = (dateKey: string, hour: number) => {
    if (readOnly) return;
    const key = slotKey(dateKey, hour);
    setSlot(dateKey, hour, !mySlots[key]);
  };

  const applySlots = (keys: string[], turnOn: boolean) => {
    if (readOnly) return;
    setMySlots((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        if (turnOn) next[key] = true;
        else delete next[key];
      }
      return next;
    });
  };

  const toggleDayColumn = (dateKey: string) => {
    if (readOnly) return;
    const keys = TEAM_SCHEDULE_HOURS.map((h) => slotKey(dateKey, h));
    const allOn = keys.every((k) => mySlots[k]);
    applySlots(keys, !allOn);
  };

  const toggleHourRow = (hour: number) => {
    if (readOnly) return;
    const keys = weekDates.map((d) => slotKey(toDateKey(d), hour));
    const allOn = keys.every((k) => mySlots[k]);
    applySlots(keys, !allOn);
  };

  const applyHours = (
    next: Record<string, boolean>,
    dateKey: string,
    hourFrom: number,
    hourTo: number
  ) => {
    for (const hour of TEAM_SCHEDULE_HOURS) {
      if (hour >= hourFrom && hour <= hourTo) {
        next[slotKey(dateKey, hour)] = true;
      }
    }
  };

  const applyPreset = (
    preset:
      | "weekday-work"
      | "weekday-am"
      | "weekday-afternoon"
      | "selected-am"
      | "selected-afternoon"
      | "clear"
  ) => {
    if (readOnly) return;
    if (preset === "clear") {
      setMySlots({});
      return;
    }

    const next: Record<string, boolean> = { ...mySlots };

    if (preset === "selected-am" || preset === "selected-afternoon") {
      if (preset === "selected-am") applyHours(next, selectedDateKey, 8, 12);
      else applyHours(next, selectedDateKey, 13, 17);
      setMySlots(next);
      return;
    }

    for (const date of weekDates) {
      const dow = date.getDay();
      const isWeekday = dow >= 1 && dow <= 5;
      if (!isWeekday) continue;
      const dateKey = toDateKey(date);
      if (preset === "weekday-work") applyHours(next, dateKey, 10, 18);
      else if (preset === "weekday-am") applyHours(next, dateKey, 8, 12);
      else if (preset === "weekday-afternoon") applyHours(next, dateKey, 13, 17);
    }
    setMySlots(next);
  };

  const startPaint = (dateKey: string, hour: number) => {
    if (readOnly) return;
    const key = slotKey(dateKey, hour);
    const nextOn = !mySlots[key];
    paintValue.current = nextOn;
    setSlot(dateKey, hour, nextOn);
  };

  const continuePaint = (dateKey: string, hour: number) => {
    if (readOnly || paintValue.current === null) return;
    setSlot(dateKey, hour, paintValue.current);
  };

  const endPaint = () => {
    paintValue.current = null;
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

  const cellVisual = (dateKey: string, hour: number, compact = false) => {
    const key = slotKey(dateKey, hour);
    const on = Boolean(mySlots[key]);
    const teamCount = effectiveCounts[key] ?? 0;
    const mix = heatMixPercent(teamCount, maxTeamCount);
    const empty = teamCount <= 0 && !on;

    return {
      key,
      on,
      teamCount,
      mix,
      className: cn(
        compact ? "min-h-11 rounded-xl border text-sm font-medium" : "min-h-11 rounded-lg border text-[10px]",
        "flex w-full flex-col items-center justify-center transition-colors select-none touch-manipulation",
        empty
          ? "border-border bg-surface/40 text-muted hover:border-primary/30 active:bg-primary/5"
          : cn("border-primary/35 text-primary", on && "ring-2 ring-primary/25 font-semibold"),
        !readOnly && "cursor-pointer"
      ),
      style:
        teamCount > 0
          ? {
              backgroundColor: `color-mix(in srgb, var(--color-primary) ${mix}%, transparent)`,
            }
          : on
            ? { backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)" }
            : undefined,
      title:
        teamCount > 0
          ? `${teamCount}명 가능${on ? " · 내 선택" : ""}`
          : on
            ? "내 가능 시간"
            : undefined,
    };
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
        <div className="flex gap-1 rounded-xl border border-border p-0.5">
          <button
            type="button"
            onClick={() => setInputMode("day")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium",
              inputMode === "day" ? "bg-primary/10 text-primary" : "text-muted"
            )}
          >
            요일별 (쉬움)
          </button>
          <button
            type="button"
            onClick={() => setInputMode("table")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium",
              inputMode === "table" ? "bg-primary/10 text-primary" : "text-muted"
            )}
          >
            주간 표
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted">
        <span>진하기</span>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className="rounded-md border border-primary/20 px-1.5 py-0.5"
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-primary) ${heatMixPercent(n, 3)}%, transparent)`,
            }}
          >
            {n === 1 ? "1명 (연함)" : n === 3 ? "3명+" : `${n}명`}
          </span>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => applyPreset("weekday-afternoon")}>
            평일 13–17시
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => applyPreset("weekday-work")}>
            평일 10–18시
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => applyPreset("weekday-am")}>
            평일 오전
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => applyPreset("clear")}>
            전체 해제
          </Button>
        </div>
      )}

      {inputMode === "day" ? (
        <div className="mt-4">
          <p className="text-xs text-muted">요일을 고른 뒤, 큰 버튼으로 가능 시간을 on/off 하세요.</p>
          {!readOnly && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => applyPreset("selected-am")}>
                선택일 오전
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => applyPreset("selected-afternoon")}>
                선택일 13–17시
              </Button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {weekDates.map((date, i) => {
              const dk = toDateKey(date);
              const dayCount = TEAM_SCHEDULE_HOURS.filter((h) => mySlots[slotKey(dk, h)]).length;
              return (
                <button
                  key={dk}
                  type="button"
                  onClick={() => setSelectedDayIdx(i)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm transition-colors",
                    selectedDayIdx === i
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted hover:border-primary/30"
                  )}
                >
                  {WEEKDAY_LABELS[date.getDay()]} {date.getDate()}
                  {dayCount > 0 && (
                    <span className="ml-1 text-[10px] opacity-80">({dayCount})</span>
                  )}
                </button>
              );
            })}
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => toggleDayColumn(selectedDateKey)}
              className="mt-2 text-xs text-primary underline"
            >
              이 요일 전체 on/off
            </button>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {TEAM_SCHEDULE_HOURS.map((hour) => {
              const v = cellVisual(selectedDateKey, hour, true);
              return (
                <button
                  key={v.key}
                  type="button"
                  disabled={readOnly}
                  onClick={() => toggleSlot(selectedDateKey, hour)}
                  className={v.className}
                  style={v.style}
                  title={v.title}
                >
                  {formatHourLabel(hour)}
                  {v.on && <span className="text-[10px]">✓</span>}
                  {v.teamCount > 1 && (
                    <span className="text-[10px] opacity-80">{v.teamCount}명</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto" onPointerUp={endPaint} onPointerLeave={endPaint}>
          <p className="mb-2 text-xs text-muted">
            요일·시간 헤더를 누르면 한 줄/한 열 전체 선택 · 셀 드래그로 여러 칸 칠하기
          </p>
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card p-2 text-left font-medium text-muted">시간</th>
                {weekDates.map((date) => {
                  const dk = toDateKey(date);
                  return (
                    <th key={dk} className="p-1">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleDayColumn(dk)}
                        className="w-full rounded-lg px-1 py-2 text-center font-medium text-muted hover:bg-surface disabled:opacity-60"
                        title="이 요일 전체 on/off"
                      >
                        <div>{WEEKDAY_LABELS[date.getDay()]}</div>
                        <div className="text-foreground">{date.getDate()}</div>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {TEAM_SCHEDULE_HOURS.map((hour) => (
                <tr key={hour} className="border-t border-border/60">
                  <td className="sticky left-0 z-10 bg-card p-1">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleHourRow(hour)}
                      className="w-full rounded-lg px-2 py-2 text-left font-medium text-muted whitespace-nowrap hover:bg-surface disabled:opacity-60"
                      title="이 시간대 전체 on/off"
                    >
                      {formatHourLabel(hour)}
                    </button>
                  </td>
                  {weekDates.map((date) => {
                    const dateKey = toDateKey(date);
                    const v = cellVisual(dateKey, hour);
                    return (
                      <td key={v.key} className="p-0.5">
                        <button
                          type="button"
                          disabled={readOnly}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            startPaint(dateKey, hour);
                          }}
                          onPointerEnter={() => continuePaint(dateKey, hour)}
                          className={v.className}
                          style={v.style}
                          title={v.title}
                        >
                          {v.on ? "✓" : v.teamCount > 0 ? "●" : ""}
                          {v.teamCount > 1 && (
                            <span className="mt-0.5">{v.teamCount}명</span>
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
      )}

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
