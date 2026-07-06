const VISIT_SESSION_KEY = "visit_sid";

export function getVisitSessionKey(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem(VISIT_SESSION_KEY);
  if (!sid) {
    sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISIT_SESSION_KEY, sid);
  }
  return sid;
}
