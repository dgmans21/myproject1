/**
 * 초대·공유용 앱 origin.
 * PC가 localhost로 열려 있어도 폰이 열 수 있게 LAN(또는 NEXT_PUBLIC_APP_URL)을 쓴다.
 */
export function getShareableAppOrigin(): string {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return origin;
    }
  }

  const api = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (api) {
    try {
      const u = new URL(api);
      if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
        const appPort = (process.env.NEXT_PUBLIC_APP_PORT || "3000").trim() || "3000";
        return `${u.protocol}//${u.hostname}:${appPort}`;
      }
    } catch {
      /* ignore */
    }
  }

  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function buildInviteJoinUrl(token: string): string {
  const origin = getShareableAppOrigin();
  return origin ? `${origin}/join/${token}` : `/join/${token}`;
}
