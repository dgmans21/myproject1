"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProfileBadgeBorder, TrustBadge } from "@/components/ProfileBadgeBorder";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { api, Profile, RecommenderTitle } from "@/lib/api";

const AGE_LABELS: Record<string, string> = {
  TEENS: "10대",
  TWENTIES: "20대",
  THIRTIES: "30대",
  FORTIES: "40대",
  FIFTIES_PLUS: "50대+",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<"info" | "titles">("info");
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.profiles.me().then(setProfile).catch(() => {});
    api.profiles.attendanceHeatmap().then(setHeatmap).catch(() => {});
  }, []);

  const handleSelectTitle = async (title: RecommenderTitle) => {
    setSaving(true);
    try {
      const updated = await api.profiles.update({ selected_title_id: title.id });
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8 text-center text-muted">불러오는 중...</main>
      </div>
    );
  }

  const activeTitle = profile.available_titles?.find((t) => t.id === profile.selected_title_id)
    ?? profile.available_titles?.[profile.available_titles.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ProfileBadgeBorder
          borderStyle={activeTitle?.border_style}
          badgeTier={profile.badge_tier}
        >
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{profile.display_name}</CardTitle>
                <CardDescription className="mt-1">
                  {AGE_LABELS[profile.age_group] ?? profile.age_group} · {profile.residence}
                </CardDescription>
              </div>
              {activeTitle && (
                <TrustBadge title={activeTitle.title} badgeColor={activeTitle.badge_color} />
              )}
            </div>
            <p className="mt-4 text-sm text-muted">
              신뢰도 <strong className="text-foreground">{profile.trust_score}</strong>점
              · 장소 채택 {profile.places_adopted_count}회
              ·{" "}
              <Link href="/ranking" className="text-primary underline">
                랭킹 보기
              </Link>
            </p>
          </Card>
        </ProfileBadgeBorder>

        <div className="mt-6 flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("info")}
            className={`px-4 py-2 text-sm font-medium ${tab === "info" ? "border-b-2 border-primary text-primary" : "text-muted"}`}
          >
            프로필
          </button>
          <button
            onClick={() => setTab("titles")}
            className={`px-4 py-2 text-sm font-medium ${tab === "titles" ? "border-b-2 border-primary text-primary" : "text-muted"}`}
          >
            칭호 관리
          </button>
        </div>

        {tab === "info" && (
          <Card className="mt-6">
            <CardTitle className="text-base">약속 이행 잔디</CardTitle>
            <CalendarHeatmap data={heatmap} className="mt-4" />
          </Card>
        )}

        {tab === "titles" && (
          <Card className="mt-6">
            <CardTitle className="text-base">칭호 관리</CardTitle>
            <p className="mt-1 text-sm text-muted">획득한 칭호 중 프로필에 표시할 칭호를 선택하세요</p>
            <div className="mt-4 space-y-2">
              {(profile.available_titles ?? []).map((title) => (
                <div
                  key={title.id}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <TrustBadge title={title.title} badgeColor={title.badge_color} />
                  <span className="text-xs text-muted">{title.min_score}점 이상</span>
                  <Button
                    size="sm"
                    variant={profile.selected_title_id === title.id ? "accent" : "secondary"}
                    disabled={saving}
                    onClick={() => handleSelectTitle(title)}
                  >
                    {profile.selected_title_id === title.id ? "사용 중" : "선택"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
