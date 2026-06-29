export const TEAM_SCHEDULE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

export type TeamScheduleHour = (typeof TEAM_SCHEDULE_HOURS)[number];

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** 해당 주 월요일 */
export function getWeekStartMonday(base = new Date()): Date {
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(base.getDate() + mondayOffset);
  return monday;
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function slotKey(dateKey: string, hour: number): string {
  return `${dateKey}|${hour}`;
}

export function parseSlotKey(key: string): { dateKey: string; hour: number } {
  const [dateKey, hourStr] = key.split("|");
  return { dateKey: dateKey!, hour: Number(hourStr) };
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
