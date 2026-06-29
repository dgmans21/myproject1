/** 방 목록·프로필 강조색 accent 프리셋 (mock·실API 공통 UI) — 13색 */
export const ROOM_ACCENT_PRESETS = [
  { id: "teal", label: "민트", value: "#2DD4BF" },
  { id: "blue", label: "블루", value: "#60A5FA" },
  { id: "violet", label: "연보라", value: "#C4B5FD" },
  { id: "rose", label: "로즈", value: "#FB7185" },
  { id: "amber", label: "앰버", value: "#FBBF24" },
  { id: "navy", label: "남색", value: "#1E3A8A" },
  { id: "emerald", label: "에메랄드", value: "#34D399" },
  { id: "orange", label: "오렌지", value: "#FB923C" },
  { id: "fuchsia", label: "푸시아", value: "#E879F9" },
  { id: "cyan", label: "시안", value: "#22D3EE" },
  { id: "lime", label: "라임", value: "#A3E635" },
  { id: "burgundy", label: "버건디", value: "#7F1D1D" },
  { id: "crimson", label: "진홍", value: "#DC2626" },
] as const;

export const DEFAULT_ROOM_ACCENT = ROOM_ACCENT_PRESETS[0].value;

export function isValidRoomAccent(color: string | undefined | null): color is string {
  return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color);
}

/** #RRGGBB 또는 RRGGBB 입력 정규화 */
export function normalizeRoomAccent(input: string): string | null {
  const trimmed = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return null;
}

export function getRoomAccentLabel(color: string | undefined | null): string | undefined {
  if (!color) return undefined;
  return ROOM_ACCENT_PRESETS.find((p) => p.value.toLowerCase() === color.toLowerCase())?.label;
}
