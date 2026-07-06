import { DashboardOutputs } from "@/components/DashboardOutputs";
import { VisitorTodayLine } from "@/components/VisitorTodayLine";
import { Sparkles, Users, MapPin, Calendar, Trophy, BookMarked, Heart } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <VisitorTodayLine className="mb-6" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/groups">
          <Card hover className="h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <CardTitle className="mt-4">방 관리</CardTitle>
            <CardDescription>한 번 만나기 · 정식 그룹 전환 · 오래 안 쓰면 보관</CardDescription>
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

        <Link href="/places/map">
          <Card hover className="h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-warm">
              <MapPin className="h-5 w-5" />
            </div>
            <CardTitle className="mt-4">맛집 탐색</CardTitle>
            <CardDescription>맛집 등급 · 추천 & 평가</CardDescription>
          </Card>
        </Link>

        <Link href="/profile">
          <Card hover className="h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="mt-4">마이페이지</CardTitle>
            <CardDescription>칭호 관리 · 약속 잔디 · 신뢰도</CardDescription>
          </Card>
        </Link>

        <Link href="/ranking">
          <Card hover className="h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-warm">
              <Trophy className="h-5 w-5" />
            </div>
            <CardTitle className="mt-4">신뢰도 랭킹</CardTitle>
            <CardDescription>칭호·신뢰도 순위 확인</CardDescription>
          </Card>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link href="/meetings/memories">
          <Card hover className="h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <BookMarked className="h-5 w-5" />
            </div>
            <CardTitle className="mt-4">만남 추억록</CardTitle>
            <CardDescription>확정된 만남 · 꼭 쓸 필요 없는 가벼운 메모</CardDescription>
          </Card>
        </Link>

        <Link href="/visitors">
          <Card hover className="h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
              <Heart className="h-5 w-5" />
            </div>
            <CardTitle className="mt-4">오늘의 방문</CardTitle>
            <CardDescription>조용히, 오늘 들러주신 분들만</CardDescription>
          </Card>
        </Link>
      </div>

      <DashboardOutputs />

      <div className="mt-8 gradient-card rounded-2xl border border-border p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-foreground">빠른 시작 가이드</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
            <span><strong className="text-foreground">그룹 만들기</strong> — 한 번 만나기 또는 정식 그룹을 생성하세요</span>
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
            <span><strong className="text-foreground">장소 추천 & 확정</strong> — 맛집 등급을 확인하고 약속을 확정하세요</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
