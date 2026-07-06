"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Heart, Users } from "lucide-react";

export default function VisitorsPage() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    api.analytics.todayCount().then((r) => setCount(r.count)).catch(() => setCount(null));
  }, []);

  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="h-7 w-7" />
        </div>
        <p className="mt-6 text-sm text-muted">{todayLabel}</p>

        {count === null ? (
          <p className="mt-4 text-sm text-muted">방문 정보를 불러오지 못했어요.</p>
        ) : count <= 0 ? (
          <p className="mt-4 text-lg text-foreground/90">
            오늘은 아직 조용한 하루예요.
          </p>
        ) : (
          <p className="mt-4 text-lg leading-relaxed text-foreground/90">
            오늘은{" "}
            <span className="font-semibold text-foreground">{count.toLocaleString("ko-KR")}명</span>
            이
            <br />
            우리지금만나에 들러주셨어요.
          </p>
        )}

        <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-muted">
          누가 왔는지는 알 수 없고, 숫자만 살짝 보여드려요.
          <br />
          들러주셔서 감사한 마음 정도만 담아둔 페이지예요.
        </p>

        <div className="mt-10 flex items-center justify-center gap-1.5 text-xs text-muted/80">
          <Heart className="h-3.5 w-3.5" />
          <span>조용히, 오늘 하루만</span>
        </div>

        <p className="mt-8 text-xs text-muted">
          상세 조회(User-Agent · IP)는{" "}
          <Link href="/admin/visits" className="text-primary hover:underline">
            관리자 방문 조회
          </Link>
          에서만 가능해요.
        </p>
      </div>
    </div>
  );
}
