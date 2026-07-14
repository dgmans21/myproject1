/** mock·실서비스 공통 세션 모드 (비회원 둘러보기) */
export type SessionMode = "member" | "guest";

const STORAGE_KEY = "ugm-session-mode";

function readGuestFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "guest") return true;
  } catch {
    /* Safari 시크릿·일부 인앱 브라우저 */
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === "guest";
  } catch {
    return false;
  }
}

function writeGuestFlag(guest: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (guest) sessionStorage.setItem(STORAGE_KEY, "guest");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    if (guest) localStorage.setItem(STORAGE_KEY, "guest");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getSessionMode(): SessionMode {
  return readGuestFlag() ? "guest" : "member";
}

export function setSessionMode(mode: SessionMode): void {
  writeGuestFlag(mode === "guest");
}

export function isGuestSession(): boolean {
  return getSessionMode() === "guest";
}

export function clearGuestSession(): void {
  setSessionMode("member");
}
