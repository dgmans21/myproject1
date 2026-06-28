/** 방 목록 구분용 accent 색 프리셋 (mock·실API 공통 UI) — 12색 */
export const ROOM_ACCENT_PRESETS = [
  { id: "teal", label: "민트", value: "#2DD4BF" },
  { id: "blue", label: "블루", value: "#60A5FA" },
  { id: "violet", label: "보라", value: "#818CF8" },
  { id: "rose", label: "로즈", value: "#FB7185" },
  { id: "amber", label: "앰버", value: "#FBBF24" },
  { id: "slate", label: "슬레이트", value: "#94A3B8" },
  { id: "emerald", label: "에메랄드", value: "#34D399" },
  { id: "orange", label: "오렌지", value: "#FB923C" },
  { id: "fuchsia", label: "푸시아", value: "#E879F9" },
  { id: "cyan", label: "시안", value: "#22D3EE" },
  { id: "lime", label: "라임", value: "#A3E635" },
  { id: "coral", label: "코랄", value: "#F87171" },
] as const;

export const DEFAULT_ROOM_ACCENT = ROOM_ACCENT_PRESETS[0].value;

export function isValidRoomAccent(color: string | undefined | null): color is string {
  return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function getRoomAccentLabel(color: string | undefined | null): string | undefined {
  if (!color) return undefined;
  return ROOM_ACCENT_PRESETS.find((p) => p.value.toLowerCase() === color.toLowerCase())?.label;
}
