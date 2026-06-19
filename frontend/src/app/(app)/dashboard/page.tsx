import { Navbar } from "@/components/Navbar";
import { Sparkles, Users, MapPin, Calendar } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
          <p className="mt-1 text-muted">약속 관리를 시작해보세요</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/groups">
            <Card hover className="h-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle className="mt-4">그룹 관리</CardTitle>
              <CardDescription>일회성 방 만들기 · 정식 그룹 승격</CardDescription>
            </Card>
          </Link>

          <Link href="/groups">
            <Card hover className="h-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Calendar className="h-5 w-5" />
              </div>
              <CardTitle className="mt-4">약속 투표</CardTitle>
              <CardDescription>2단계 투표로 최적의 일정 확정</CardDescription>
            </Card>
          </Link>

          <Link href="/places">
            <Card hover className="h-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-warm">
                <MapPin className="h-5 w-5" />
              </div>
              <CardTitle className="mt-4">맛집 탐색</CardTitle>
              <CardDescription>티어제 기반 장소 추천 & 평가</CardDescription>
            </Card>
          </Link>

          <Card className="h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="mt-4">이동 시간</CardTitle>
            <CardDescription>출발지 기준 도착 시간 자동 예측</CardDescription>
          </Card>
        </div>

        <div className="mt-8 gradient-card rounded-2xl border border-border p-8">
          <h2 className="text-lg font-semibold text-foreground">빠른 시작 가이드</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
              <span><strong className="text-foreground">그룹 만들기</strong> — 일회성 방 또는 정식 그룹을 생성하세요</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
              <span><strong className="text-foreground">약속 생성 & 1차 투표</strong> — 멤버들이 가능한 날짜를 투표합니다</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
              <span><strong className="text-foreground">2차 시간 투표</strong> — 겹치는 날짜에서 최적 시간을 선택합니다</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">4</span>
              <span><strong className="text-foreground">장소 추천 & 확정</strong> — 맛집 티어를 확인하고 약속을 확정하세요</span>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}
