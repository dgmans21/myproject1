"use client";

import { cn } from "@/lib/utils";

interface HeatmapDay {
  date: string;
  count: number;
}

interface CalendarHeatmapProps {
  data: HeatmapDay[];
  weeks?: number;
  className?: string;
}

function getIntensity(count: number): string {
  if (count >= 3) return "bg-primary";
  if (count === 2) return "bg-primary/70";
  if (count === 1) return "bg-primary/40";
  return "bg-surface";
}

export function CalendarHeatmap({ data, weeks = 13, className }: CalendarHeatmapProps) {
  const countMap = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  const cells: { date: string; count: number }[] = [];

  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    cells.push({ date: key, count: countMap.get(key) ?? 0 });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1">
        {cells.map(({ date, count }) => (
          <div
            key={date}
            title={`${date}: ${count}회 약속`}
            className={cn("h-3 w-3 rounded-sm", getIntensity(count))}
          />
        ))}
      </div>
      <p className="text-xs text-muted">최근 {weeks}주 약속 이행 잔디</p>
    </div>
  );
}
