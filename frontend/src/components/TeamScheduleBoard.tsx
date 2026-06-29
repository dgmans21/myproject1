"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { VoteMonthCalendar } from "@/components/VoteMonthCalendar";
import type { VoteSummary } from "@/lib/api";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export interface TeamScheduleItem {
  id: string;
  label: string;
  done: boolean;
}

interface TeamScheduleBoardProps {
  selectedDates: Set<string>;
  onToggleDate: (date: string) => void;
  voteSummary?: VoteSummary[];
  teamItems?: TeamScheduleItem[];
  onToggleTeamItem?: (id: string) => void;
  readOnly?: boolean;
  className?: string;
}

function getWeekDates(base = new Date()): Date[] {
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DEFAULT_TEAM_ITEMS: TeamScheduleItem[] = [
  { id: "meeting", label: "회의", done: false },
  { id: "design", label: "디자인", done: false },
  { id: "qa", label: "QA", done: false },
  { id: "deploy", label: "배포", done: false },
];

/**
 * 팀 일정 UI — 주간(업무 체크 + 이번 주 날짜) / 월간(가능 날 투표) 전환.
 * 단순 체크박스만으로는 참여율 파악이 어려워 월간은 멤버 투표 집계를 유지합니다.
 */
export function TeamScheduleBoard({
  selectedDates,
  onToggleDate,
  voteSummary = [],
  teamItems = DEFAULT_TEAM_ITEMS,
  onToggleTeamItem,
  readOnly = false,
  className,
}: TeamScheduleBoardProps) {
  const [view, setView] = useState<"week" | "month">("week");
  const weekDates = useMemo(() => getWeekDates(), []);
  const summaryMap = useMemo(
    () => new Map(voteSummary.map((s) => [s.vote_date, s])),
    [voteSummary]
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView("week")}
          className={cn(
            "rounded-xl border px-4 py-2 text-sm font-medium",
            view === "week" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
          )}
        >
          주간 보기
        </button>
        <button
          type="button"
          onClick={() => setView("month")}
          className={cn(
            "rounded-xl border px-4 py-2 text-sm font-medium",
            view === "month" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
          )}
        >
          월간 캘린더
        </button>
      </div>

      {view === "week" ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">이번 주 팀 일정</p>
          <p className="mt-1 text-xs text-muted">
            마일스톤 체크와 함께, 아래 날짜를 눌러 팀원 가능 여부를 표시하세요.
          </p>

          <ul className="mt-4 space-y-2">
            {teamItems.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={readOnly}
                    onChange={() => onToggleTeamItem?.(item.id)}
                    className="rounded border-border"
                  />
                  <span className={item.done ? "text-muted line-through" : "text-foreground"}>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid grid-cols-7 gap-1 text-center">
            {weekDates.map((date, i) => {
              const key = toDateKey(date);
              const selected = selectedDates.has(key);
              const summary = summaryMap.get(key);
              return (
                <div key={key} className="space-y-1">
                  <div className="text-xs font-medium text-muted">{WEEKDAYS[i]}</div>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => !readOnly && onToggleDate(key)}
                    className={cn(
                      "w-full rounded-xl border py-2 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/15 text-primary font-semibold"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {date.getDate()}
                  </button>
                  {summary && (
                    <div className="text-[10px] text-muted">
                      {summary.available_count}/{summary.total_members}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <VoteMonthCalendar
          selectedDates={selectedDates}
          onToggleDate={readOnly ? () => {} : onToggleDate}
          voteSummary={voteSummary}
        />
      )}
    </div>
  );
}
