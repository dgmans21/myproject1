/** 한 줄 소개 · 상태문구 (마이페이지·프로필 모달) */
export const PROFILE_STATUS_MAX_LENGTH = 40;

export function normalizeProfileStatus(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, PROFILE_STATUS_MAX_LENGTH);
}
