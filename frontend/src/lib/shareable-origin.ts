/** 192.168.*, 10.*, 172.16-31.* — DHCP로 끝자리가 바뀌어도 매번 .env 안 고쳐도 되게 감지용 */
function isPrivateLanHost(hostname: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)\d{1,3}\.\d{1,3}$/.test(hostname);
}

/**
 * 초대·공유용 앱 origin.
 * PC가 localhost로 열려 있어도 폰이 열 수 있게 LAN(또는 NEXT_PUBLIC_APP_URL)을 쓴다.
 */
export function getShareableAppOrigin(): string {
  // LAN IP로 접속 중이면 지금 붙어 있는 그 주소가 항상 최신값 — .env보다 우선.
  if (typeof window !== "undefined" && isPrivateLanHost(window.location.hostname)) {
    return window.location.origin;
  }

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
