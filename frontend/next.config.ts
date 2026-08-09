import type { NextConfig } from "next";

/** 폰 LAN 접속용 — `frontend/.env.local`의 `DEV_LAN_IP`만 사용 (코드에 실IP 하드코딩 금지) */
const lanIp = (process.env.DEV_LAN_IP || "").trim();

/** 같은 /24 의 .100~.250 — DHCP로 IP가 바뀌어도 /_next 차단 방지 */
function lanDevOrigins(ip: string): string[] {
  const m = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{1,3})$/);
  if (!m) return ip ? [ip] : [];
  const prefix = m[1];
  const hosts: string[] = [];
  for (let n = 100; n <= 250; n += 1) {
    hosts.push(`${prefix}.${n}`);
  }
  return hosts;
}

const nextConfig: NextConfig = {
  // 폰 등 LAN에서 dev 접속 시 /_next/* 리소스 차단 방지
  allowedDevOrigins: lanDevOrigins(lanIp),
};

export default nextConfig;
