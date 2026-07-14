import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 폰 등 LAN에서 dev 접속 시 /_next/* 리소스 차단 방지 (터미널 allowedDevOrigins 안내)
  allowedDevOrigins: ["192.168.200.103"],
};

export default nextConfig;
