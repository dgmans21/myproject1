import type { NextConfig } from "next";

/** 폰 LAN 접속용 — `frontend/.env.local`의 `DEV_LAN_IP`만 사용 (코드에 실IP 하드코딩 금지) */
const lanIp = (process.env.DEV_LAN_IP || "").trim();

const nextConfig: NextConfig = {
  // 폰 등 LAN에서 dev 접속 시 /_next/* 리소스 차단 방지
  allowedDevOrigins: lanIp ? [lanIp] : [],
};

export default nextConfig;
