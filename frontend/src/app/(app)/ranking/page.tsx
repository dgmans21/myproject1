"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { TrustBadge } from "@/components/ProfileBadgeBorder";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { api, RankingEntry } from "@/lib/api";
import { Crown, Medal, Trophy } from "lucide-react";

const PODIUM_STYLES = [
  "from-amber-100 to-amber-50 border-amber-300/60",
  "from-slate-100 to-slate-50 border-slate-300/60",
  "from-orange-100 to-orange-50 border-orange-300/50",
];

export default function RankingPage() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.profiles
      .ranking(50)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Trophy className="h-7 w-7 text-warm" />
            신뢰도 랭킹
          </h1>
          <p className="mt-1 text-sm text-muted">
            장소 추천으로 쌓은 신뢰도 순위 · 칭호는 획득 점수에 따라 달라집니다
          </p>
        </div>

        {loading ? (
          <p className="py-16 text-center text-muted">불러오는 중...</p>
        ) : entries.length === 0 ? (
          <p className="py-16 text-center text-muted">아직 랭킹 데이터가 없습니다</p>
        ) : (
          <>
            {topThree.length > 0 && (
              <div className="mb-8 grid gap-3 sm:grid-cols-3">
                {topThree.map((entry, idx) => (
                  <Card
                    key={entry.user_id}
                    className={`border bg-gradient-to-br ${PODIUM_STYLES[idx] ?? ""} ${
                      entry.is_me ? "ring-2 ring-primary/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                      {idx === 0 ? (
                        <Crown className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Medal className="h-4 w-4" />
                      )}
                      {entry.rank}위
                    </div>
                    <CardTitle className="mt-2 text-lg">{entry.display_name}</CardTitle>
                    <CardDescription>{entry.residence}</CardDescription>
                    <p className="mt-3 text-2xl font-bold text-foreground">
                      {entry.trust_score.toLocaleString()}점
                    </p>
                    {entry.selected_title && (
                      <TrustBadge
                        className="mt-2"
                        title={entry.selected_title}
                        badgeColor={entry.badge_color}
                      />
                    )}
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardTitle className="text-base">전체 순위</CardTitle>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="pb-3 pr-4 font-medium">순위</th>
                      <th className="pb-3 pr-4 font-medium">닉네임</th>
                      <th className="pb-3 pr-4 font-medium">칭호</th>
                      <th className="pb-3 pr-4 font-medium">신뢰도</th>
                      <th className="pb-3 font-medium">거주지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((entry) => (
                      <tr
                        key={entry.user_id}
                        className={`border-b border-border/60 last:border-0 ${
                          entry.is_me ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="py-3 pr-4 font-semibold text-muted">{entry.rank}</td>
                        <td className="py-3 pr-4 font-medium text-foreground">
                          {entry.display_name}
                          {entry.is_me && (
                            <span className="ml-2 text-xs text-primary">나</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {entry.selected_title ? (
                            <TrustBadge
                              title={entry.selected_title}
                              badgeColor={entry.badge_color}
                            />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-semibold">
                          {entry.trust_score.toLocaleString()}
                        </td>
                        <td className="py-3 text-muted">{entry.residence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <p className="mt-6 text-center text-xs text-muted">
              내 칭호는{" "}
              <Link href="/profile" className="text-primary underline">
                마이페이지 → 칭호 관리
              </Link>
              에서 변경할 수 있어요
            </p>
          </>
        )}
      </main>
    </div>
  );
}
