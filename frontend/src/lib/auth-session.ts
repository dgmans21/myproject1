/** mock·실서비스 공통 세션 모드 (비회원 둘러보기) */
export type SessionMode = "member" | "guest";

const STORAGE_KEY = "ugm-session-mode";

export function getSessionMode(): SessionMode {
  if (typeof window === "undefined") return "member";
  return sessionStorage.getItem(STORAGE_KEY) === "guest" ? "guest" : "member";
}

export function setSessionMode(mode: SessionMode): void {
  if (typeof window === "undefined") return;
  if (mode === "guest") sessionStorage.setItem(STORAGE_KEY, "guest");
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function isGuestSession(): boolean {
  return getSessionMode() === "guest";
}

export function clearGuestSession(): void {
  setSessionMode("member");
}
