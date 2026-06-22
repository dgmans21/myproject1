"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { api } from "@/lib/api";

export function DashboardOutputs() {
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    api.profiles.attendanceHeatmap().then(setHeatmap).catch(() => {});
  }, []);

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle className="text-base">내 약속 잔디</CardTitle>
        <CardDescription className="mt-1">최근 모임 이행 빈도</CardDescription>
        <CalendarHeatmap data={heatmap} className="mt-4" weeks={10} />
        <Link href="/profile" className="mt-3 inline-block text-sm text-primary hover:underline">
          마이페이지에서 칭호·잔디 관리 →
        </Link>
      </Card>

      <Card>
        <CardTitle className="text-base">출력 UI 미리보기</CardTitle>
        <CardDescription className="mt-1">요청사항별 화면 바로가기</CardDescription>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <Link href="/groups/demo-room-1/appointments/demo-apt-1" className="text-primary hover:underline">
              1차 월간 캘린더 투표
            </Link>
          </li>
          <li>
            <Link href="/groups/demo-room-1/appointments/demo-apt-2" className="text-primary hover:underline">
              2차 시간 + 장소 지도·이동시간
            </Link>
          </li>
          <li>
            <Link href="/groups/demo-room-2/appointments/demo-apt-3" className="text-primary hover:underline">
              확정 출력 · 지도 · 모임 결산
            </Link>
          </li>
          <li>
            <Link href="/places/map" className="text-primary hover:underline">
              맛집 지도 전용 페이지
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
