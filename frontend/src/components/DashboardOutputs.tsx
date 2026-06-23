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
    <Card className="mt-8">
      <CardTitle className="text-base">내 약속 잔디</CardTitle>
      <CardDescription className="mt-1">최근 모임 이행 빈도</CardDescription>
      <CalendarHeatmap data={heatmap} className="mt-4" weeks={10} />
      <Link href="/profile" className="mt-3 inline-block text-sm text-primary hover:underline">
        마이페이지에서 칭호·잔디 관리 →
      </Link>
    </Card>
  );
}
