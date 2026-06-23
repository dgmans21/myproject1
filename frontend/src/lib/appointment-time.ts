/** 약속 일시 파싱 · D-Day · 모임 종료 판단 */

export function parseAppointmentDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.slice(0, 5).split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function minutesUntilAppointment(dateStr: string, timeStr: string, now = new Date()): number {
  const start = parseAppointmentDateTime(dateStr, timeStr);
  return Math.round((start.getTime() - now.getTime()) / 60000);
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "곧 시작";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export function formatDDay(dateStr: string, now = new Date()): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export function isMeetingEnded(dateStr: string, timeStr: string, now = new Date()): boolean {
  const start = parseAppointmentDateTime(dateStr, timeStr);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return now >= end;
}

export function formatArrivalTime(dateStr: string, timeStr: string, durationMinutes: number): string {
  const eta = new Date(parseAppointmentDateTime(dateStr, timeStr).getTime());
  const now = new Date();
  const arrival = new Date(now.getTime() + durationMinutes * 60000);
  return arrival.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function punctualityStatus(
  appointmentDate: string,
  appointmentTime: string,
  durationMinutes: number,
  departed: boolean
): "ok" | "risk" | "late" | "unknown" {
  if (!departed) return "unknown";
  const start = parseAppointmentDateTime(appointmentDate, appointmentTime);
  const now = new Date();
  const arrival = new Date(now.getTime() + durationMinutes * 60000);
  const diffMin = Math.round((arrival.getTime() - start.getTime()) / 60000);
  if (diffMin <= 0) return "ok";
  if (diffMin <= 15) return "risk";
  return "late";
}
