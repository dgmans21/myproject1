"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** 대시보드 등 — 당일 unique 방문자 (익명 포함), 눈에 띄지 않게 */
export function VisitorTodayLine({ className = "" }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    api.analytics.todayCount().then((r) => setCount(r.count)).catch(() => {});
  }, []);

  if (count === null || count <= 0) return null;

  return (
    <p className={`text-center text-sm text-muted ${className}`.trim()}>
      오늘은 <span className="text-foreground">{count.toLocaleString("ko-KR")}명</span>이
      방문해주셨습니다
    </p>
  );
}
