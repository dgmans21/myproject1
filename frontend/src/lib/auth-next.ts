/** 로그인 후 리다이렉트용 — open redirect 방지 */
export function safeAuthNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  const value = (raw || "").trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  return value;
}
