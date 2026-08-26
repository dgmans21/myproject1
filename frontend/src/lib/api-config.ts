export type ApiMode = "mock" | "http" | "hybrid";

/** 192.168.*, 10.*, 172.16-31.* — DHCP로 끝자리가 바뀌어도 매번 .env 안 고쳐도 되게 감지용 */
function isPrivateLanHost(hostname: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)\d{1,3}\.\d{1,3}$/.test(hostname);
}

export function getApiMode(): ApiMode {
  const explicit = process.env.NEXT_PUBLIC_API_MODE?.trim().toLowerCase();
  if (explicit === "mock" || explicit === "http" || explicit === "hybrid") {
    return explicit;
  }
  if (process.env.NEXT_PUBLIC_API_URL?.trim()) {
    return "hybrid";
  }
  return "mock";
}

export function getApiBaseUrl(): string {
  // 폰·PC가 LAN IP로 접속한 경우: 지금 붙어 있는 그 IP로 되돌려준다.
  // DHCP가 끝자리를 바꿔도 .env(NEXT_PUBLIC_API_URL)를 매번 안 고쳐도 됨.
  if (typeof window !== "undefined" && isPrivateLanHost(window.location.hostname)) {
    return `http://${window.location.hostname}:8000`;
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
}

export function isHttpEnabled(): boolean {
  return getApiMode() !== "mock";
}

