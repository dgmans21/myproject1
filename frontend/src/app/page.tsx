import Link from "next/link";
import { Calendar, Clock, MapPin, Users, Vote, ArrowRight } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: Vote,
    title: "2단계 스마트 투표",
    description: "1차 날짜 투표로 겹치는 날을 추린 뒤, 2차 시간 투표로 확정률을 극대화합니다.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Clock,
    title: "이동 시간 예측",
    description: "출발지 기준 Kakao Maps API로 각 멤버의 도착 시간을 미리 확인합니다.",
    color: "text-accent bg-accent/10",
  },
  {
    icon: MapPin,
    title: "맛집 티어 & 칭호",
    description: "평점 남용을 막는 알고리즘과 추천 유저 칭호 시스템으로 신뢰할 수 있는 장소를 찾습니다.",
    color: "text-warm bg-orange-100",
  },
  {
    icon: Users,
    title: "유연한 그룹 관리",
    description: "일회성 방부터 정식 그룹 승격까지, 목적에 맞는 그룹핑을 지원합니다.",
    color: "text-purple-600 bg-purple-100",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Calendar className="h-4 w-4" />
                스마트 약속 관리
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground lg:text-5xl">
                모두가 모일 수 있는
                <br />
                <span className="text-primary">완벽한 약속</span>을 잡으세요
              </h1>
              <p className="mt-4 text-lg text-muted leading-relaxed">
                우리지금만나는 이동 시간 예측과 2단계 투표,
                신뢰도 칭호로 약속 확정 성공률을 높이는 스마트 약속 관리 앱입니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#auth">
                  <Button size="lg">
                    시작하기
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="secondary" size="lg">
                    기능 알아보기
                  </Button>
                </Link>
              </div>
            </div>

            <div id="auth" className="flex justify-center lg:justify-end">
              <AuthForm />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">핵심 기능</h2>
            <p className="mt-2 text-muted">약속 잡기의 모든 과정을 더 스마트하게</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description, color }) => (
              <div
                key={title}
                className="gradient-card rounded-2xl border border-border p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`inline-flex rounded-xl p-3 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted">
          우리지금만나 &copy; 2026 — Supabase + Kakao Maps 기반
        </div>
      </footer>
    </div>
  );
}
