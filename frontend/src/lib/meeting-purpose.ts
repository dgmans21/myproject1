/** 일반 모임방 — 이번 모임의 주목적 */

export const MEETING_PURPOSE_OPTIONS = [
  { id: "MAJOR_PRESENTATION", label: "중대발표" },
  { id: "MONTHLY", label: "월간모임" },
  { id: "CASUAL", label: "단순모임" },
  { id: "FLASH", label: "번개" },
  { id: "OTHER", label: "기타" },
] as const;

export type MeetingPurposeId = (typeof MEETING_PURPOSE_OPTIONS)[number]["id"];

export interface MeetingPurposeValue {
  purpose?: MeetingPurposeId;
  purpose_custom?: string;
}

export function meetingPurposeLabel(value?: MeetingPurposeValue | null): string | undefined {
  if (!value?.purpose) return undefined;
  if (value.purpose === "OTHER") {
    return value.purpose_custom?.trim() || "기타";
  }
  return MEETING_PURPOSE_OPTIONS.find((o) => o.id === value.purpose)?.label;
}

export function isValidMeetingPurpose(id: string | undefined | null): id is MeetingPurposeId {
  return Boolean(id && MEETING_PURPOSE_OPTIONS.some((o) => o.id === id));
}
