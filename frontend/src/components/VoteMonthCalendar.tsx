"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { VoteSummary } from "@/lib/api";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface VoteMonthCalendarProps {
  selectedDates: Set<string>;
  onToggleDate: (date: string) => void;
  voteSummary?: VoteSummary[];
  minDate?: Date;
  className?: string;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = [];

  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

export function VoteMonthCalendar({
  selectedDates,
  onToggleDate,
  voteSummary = [],
  minDate = new Date(),
  className,
}: VoteMonthCalendarProps) {
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const summaryMap = useMemo(
    () => new Map(voteSummary.map((s) => [s.vote_date, s])),
    [voteSummary]
  );

  const cells = buildMonthGrid(view.year, view.month);
  const minKey = toDateKey(minDate);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setView((v) => {
              const d = new Date(v.year, v.month - 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })
          }
          className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface"
        >
          ←
        </button>
        <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
        <button
          type="button"
          onClick={() =>
            setView((v) => {
              const d = new Date(v.year, v.month + 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })
          }
          className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 font-medium">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;

          const key = toDateKey(date);
          const isPast = key < minKey;
          const selected = selectedDates.has(key);
          const summary = summaryMap.get(key);

          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              onClick={() => !isPast && onToggleDate(key)}
              className={cn(
                "relative flex min-h-[52px] flex-col items-center justify-center rounded-xl border text-sm transition-all",
                isPast && "cursor-not-allowed opacity-30 border-transparent",
                !isPast && selected && "border-primary bg-primary/15 text-primary font-semibold",
                !isPast && !selected && "border-border bg-background hover:border-primary/40"
              )}
            >
              <span>{date.getDate()}</span>
              {summary && (
                <span className="mt-0.5 text-[10px] text-muted">
                  {summary.available_count}/{summary.total_members}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        날짜를 눌러 가능한 날을 선택하세요. 숫자는 멤버별 1차 투표 참여 현황입니다.
      </p>
    </div>
  );
}
