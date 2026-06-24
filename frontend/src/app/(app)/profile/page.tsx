"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProfileBadgeBorder, TrustBadge } from "@/components/ProfileBadgeBorder";
import { SocialPointBadge } from "@/components/SocialPointBadge";
import { MbtiBadge } from "@/components/MbtiBadge";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { ProfileDecorPanel } from "@/components/ProfileDecorPanel";
import { api, Profile, RecommenderTitle, SocialPointTitle } from "@/lib/api";
import { MBTI_OPTIONS } from "@/lib/mbti";

const AGE_LABELS: Record<string, string> = {
  TEENS: "10대",
  TWENTIES: "20대",
  THIRTIES: "30대",
  FORTIES: "40대",
  FIFTIES_PLUS: "50대+",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<"info" | "decor" | "trust" | "social">("info");
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [mbtiDraft, setMbtiDraft] = useState<string[]>([]);

  useEffect(() => {
    api.profiles.me().then((p) => {
      setProfile(p);
      setMbtiDraft(p.mbti_types ?? []);
    }).catch(() => {});
    api.profiles.attendanceHeatmap().then(setHeatmap).catch(() => {});
  }, []);

  const handleSelectTrustTitle = async (title: RecommenderTitle) => {
    setSaving(true);
    try {
      const updated = await api.profiles.update({ selected_title_id: title.id });
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSocialTitle = async (title: SocialPointTitle) => {
    setSaving(true);
    try {
      const updated = await api.profiles.update({ selected_social_title_id: title.id });
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  };

  const toggleMbti = (type: string) => {
    setMbtiDraft((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      if (prev.length >= 2) return prev;
      return [...prev, type];
    });
  };

  const saveMbti = async () => {
    setSaving(true);
    try {
      const updated = await api.profiles.update({ mbti_types: mbtiDraft });
      setProfile(updated);
      setMbtiDraft(updated.mbti_types);
    } catch (err) {
      alert(err instanceof Error ? err.message : "MBTI 저장 실패");
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

  const activeTrustTitle = profile.available_titles?.find((t) => t.id === profile.selected_title_id)
    ?? profile.available_titles?.[profile.available_titles.length - 1];

  const activeSocialTitle = profile.available_social_titles?.find(
    (t) => t.id === profile.selected_social_title_id
  ) ?? profile.available_social_titles?.filter(
    (t) => t.min_points <= profile.social_points
  ).slice(-1)[0];

  const mbtiChanged =
    mbtiDraft.length !== profile.mbti_types.length ||
    mbtiDraft.some((t, i) => profile.mbti_types[i] !== t);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ProfileBadgeBorder
          borderStyle={activeTrustTitle?.border_style ?? activeSocialTitle?.border_style}
          badgeTier={profile.badge_tier}
        >
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{profile.display_name}</CardTitle>
                <CardDescription className="mt-1">
                  {AGE_LABELS[profile.age_group] ?? profile.age_group} · {profile.residence}
                </CardDescription>
                {profile.mbti_types.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.mbti_types.map((t) => (
                      <MbtiBadge key={t} type={t} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {activeTrustTitle && (
                  <TrustBadge title={activeTrustTitle.title} badgeColor={activeTrustTitle.badge_color} />
                )}
                {activeSocialTitle && (
                  <SocialPointBadge title={activeSocialTitle.title} badgeColor={activeSocialTitle.badge_color} />
                )}
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              신뢰도 <strong className="text-foreground">{profile.trust_score}</strong>점
              · 소셜 <strong className="text-foreground">{profile.social_points}</strong>P
              · 장소 채택 {profile.places_adopted_count}회
              ·{" "}
              <Link href="/ranking" className="text-primary underline">
                랭킹 보기
              </Link>
            </p>
          </Card>
        </ProfileBadgeBorder>

        <div className="mt-6 flex gap-2 border-b border-border overflow-x-auto">
          {([
            ["info", "프로필"],
            ["decor", "꾸미기"],
            ["trust", "신뢰 칭호"],
            ["social", "소셜 칭호"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 px-4 py-2 text-sm font-medium ${
                tab === key ? "border-b-2 border-primary text-primary" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <>
            <Card className="mt-6">
              <CardTitle className="text-base">MBTI (최대 2개)</CardTitle>
              <p className="mt-1 text-sm text-muted">방 멤버 목록·칭찬 패널에 표시됩니다</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {MBTI_OPTIONS.map((type) => {
                  const selected = mbtiDraft.includes(type);
                  const disabled = !selected && mbtiDraft.length >= 2;
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleMbti(type)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : disabled
                            ? "border-border text-muted/40 cursor-not-allowed"
                            : "border-border text-muted hover:border-primary/40"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              {mbtiChanged && (
                <Button className="mt-4" size="sm" disabled={saving} onClick={saveMbti}>
                  MBTI 저장
                </Button>
              )}
            </Card>
            <Card className="mt-6">
              <CardTitle className="text-base">약속 이행 잔디</CardTitle>
              <CalendarHeatmap data={heatmap} className="mt-4" />
            </Card>
          </>
        )}

        {tab === "decor" && <ProfileDecorPanel />}

        {tab === "trust" && (
          <Card className="mt-6">
            <CardTitle className="text-base">신뢰 칭호</CardTitle>
            <p className="mt-1 text-sm text-muted">맛집 추천·채택으로 쌓인 신뢰도 칭호입니다</p>
            <div className="mt-4 space-y-2">
              {(profile.available_titles ?? []).map((title) => (
                <div
                  key={title.id}
                  className="flex items-center justify-between rounded-xl border border-border p-3 gap-2 flex-wrap"
                >
                  <TrustBadge title={title.title} badgeColor={title.badge_color} />
                  <span className="text-xs text-muted">{title.min_score}점 이상</span>
                  <Button
                    size="sm"
                    variant={profile.selected_title_id === title.id ? "accent" : "secondary"}
                    disabled={saving}
                    onClick={() => handleSelectTrustTitle(title)}
                  >
                    {profile.selected_title_id === title.id ? "사용 중" : "선택"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "social" && (
          <Card className="mt-6">
            <CardTitle className="text-base">소셜 칭호</CardTitle>
            <p className="mt-1 text-sm text-muted">
              칭찬 스티커·이동 리워드로 쌓인 포인트 칭호입니다. 방마다 따로가 아니라 계정 전체 포인트입니다.
            </p>
            <p className="mt-3 text-sm">
              현재 <strong className="text-foreground">{profile.social_points}P</strong>
            </p>
            <div className="mt-4 space-y-2">
              {(profile.available_social_titles ?? []).map((title) => (
                <div
                  key={title.id}
                  className="flex items-center justify-between rounded-xl border border-border p-3 gap-2 flex-wrap"
                >
                  <SocialPointBadge title={title.title} badgeColor={title.badge_color} />
                  <span className="text-xs text-muted">{title.min_points}P 이상</span>
                  <Button
                    size="sm"
                    variant={profile.selected_social_title_id === title.id ? "accent" : "secondary"}
                    disabled={saving || profile.social_points < title.min_points}
                    onClick={() => handleSelectSocialTitle(title)}
                  >
                    {profile.selected_social_title_id === title.id ? "사용 중" : "선택"}
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
