"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { TrustBadge } from "@/components/ProfileBadgeBorder";
import { SocialPointBadge } from "@/components/SocialPointBadge";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { ProfileSummaryCard } from "@/components/ProfileSummaryCard";
import { ProfileDecorPanel } from "@/components/ProfileDecorPanel";
import { ProfileInterestsPanel } from "@/components/ProfileInterestsPanel";
import { api, Profile, RecommenderTitle, SocialPointTitle, toPublicProfileView } from "@/lib/api";
import { AUTH_AGE_OPTIONS } from "@/lib/auth-ui-constants";
import { MBTI_OPTIONS } from "@/lib/mbti";
import { isAdmin } from "@/lib/permissions";
import { PROFILE_STATUS_MAX_LENGTH } from "@/lib/profile-status";
import { useAuthSession } from "@/lib/use-auth-session";
import Link from "next/link";
import { Lock, LogIn } from "lucide-react";

function ProfileGuestGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <Card className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <CardTitle className="mt-6 text-lg">로그인 후 이용 가능합니다</CardTitle>
        <CardDescription className="mt-3 leading-relaxed">
          마이페이지는 회원만 이용할 수 있어요. 방·맛집 둘러보기는 그대로 가능하고, 프로필·칭호·
          잔디 관리는 로그인 후에 이어서 하실 수 있습니다.
        </CardDescription>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border"
          >
            대시보드로
          </Link>
          <Button onClick={onLogin}>
            <LogIn className="h-4 w-4" /> 로그인 · 가입하기
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ProfileMemberContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<"info" | "decor" | "interests" | "trust" | "social">("info");
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [mbtiDraft, setMbtiDraft] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState("");
  const [ageGroupDraft, setAgeGroupDraft] = useState<Profile["age_group"]>("TWENTIES");
  const [residenceDraft, setResidenceDraft] = useState("");

  useEffect(() => {
    api.profiles.me().then((p) => {
      setProfile(p);
      setMbtiDraft(p.mbti_types ?? []);
      setStatusDraft(p.status_message ?? "");
      setAgeGroupDraft(p.age_group);
      setResidenceDraft(p.residence);
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

  const saveStatus = async () => {
    setSaving(true);
    try {
      const updated = await api.profiles.update({ status_message: statusDraft });
      setProfile(updated);
      setStatusDraft(updated.status_message ?? "");
    } catch (err) {
      alert(err instanceof Error ? err.message : "소개 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const saveBasicInfo = async () => {
    const residence = residenceDraft.trim();
    if (!residence) {
      alert("거주지를 입력해 주세요");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.profiles.update({
        age_group: ageGroupDraft,
        residence,
      });
      setProfile(updated);
      setAgeGroupDraft(updated.age_group);
      setResidenceDraft(updated.residence);
    } catch (err) {
      alert(err instanceof Error ? err.message : "프로필 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 text-center text-muted">불러오는 중...</div>
    );
  }

  const mbtiChanged =
    mbtiDraft.length !== profile.mbti_types.length ||
    mbtiDraft.some((t, i) => profile.mbti_types[i] !== t);

  const statusChanged = statusDraft !== (profile.status_message ?? "");

  const basicInfoChanged =
    ageGroupDraft !== profile.age_group || residenceDraft.trim() !== profile.residence;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <ProfileSummaryCard
          profile={toPublicProfileView(profile, true)}
          showRankingLink
        />

        <div className="mt-6 flex gap-2 border-b border-border overflow-x-auto">
          {([
            ["info", "프로필"],
            ["decor", "꾸미기"],
            ["interests", "취미·관심"],
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
              <CardTitle className="text-base">나이대 · 거주지</CardTitle>
              <CardDescription className="mt-1">
                프로필 상단과 방 멤버 목록에 표시됩니다. 회원가입 후에도 수정할 수 있습니다.
              </CardDescription>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ageGroup" className="mb-1.5 block text-sm font-medium text-foreground">
                    나이대
                  </label>
                  <select
                    id="ageGroup"
                    value={ageGroupDraft}
                    onChange={(e) => setAgeGroupDraft(e.target.value as Profile["age_group"])}
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    {AUTH_AGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="거주지 (시/구)"
                  id="residence"
                  value={residenceDraft}
                  onChange={(e) => setResidenceDraft(e.target.value)}
                  placeholder="서울 강남구"
                  autoComplete="address-level2"
                />
              </div>
              {basicInfoChanged && (
                <Button className="mt-4" size="sm" disabled={saving} onClick={saveBasicInfo}>
                  나이대·거주지 저장
                </Button>
              )}
            </Card>
            <Card className="mt-6">
              <CardTitle className="text-base">한 줄 소개 · 상태</CardTitle>
              <CardDescription className="mt-1">
                나이·거주지 아래 별도 줄로 표시됩니다. 방 멤버가 프로필을 볼 때도 보입니다.
              </CardDescription>
              <Textarea
                className="mt-4"
                label="소개"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value.slice(0, PROFILE_STATUS_MAX_LENGTH))}
                placeholder="한 줄 소개 · 오늘의 상태 (선택)"
                rows={2}
                maxLength={PROFILE_STATUS_MAX_LENGTH}
              />
              <p className="mt-1 text-right text-xs text-muted">
                {statusDraft.length}/{PROFILE_STATUS_MAX_LENGTH}
              </p>
              {statusChanged && (
                <Button className="mt-3" size="sm" disabled={saving} onClick={saveStatus}>
                  소개 저장
                </Button>
              )}
            </Card>
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
            {isAdmin(profile) && (
              <p className="mt-6 text-center text-sm">
                <Link href="/admin/visits" className="text-muted hover:text-primary hover:underline">
                  방문 조회 (관리자)
                </Link>
              </p>
            )}
          </>
        )}

        {tab === "decor" && (
          <ProfileDecorPanel
            onUpdated={(p) => setProfile(p)}
          />
        )}

        {tab === "interests" && (
          <ProfileInterestsPanel onUpdated={(p) => setProfile(p)} />
        )}

        {tab === "trust" && (
          <Card className="mt-6">
            <CardTitle className="text-base">신뢰 칭호</CardTitle>
            <p className="mt-1 text-sm text-muted">맛집 추천·채택으로 쌓인 신뢰도 칭호입니다</p>
            <div className="mt-4 space-y-2">
              {(profile.available_titles ?? []).map((title) => (
                <div
                  key={title.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <TrustBadge
                      className="max-w-full"
                      title={title.title}
                      badgeColor={title.badge_color}
                    />
                    <span className="shrink-0 text-xs text-muted">{title.min_score}점 이상</span>
                  </div>
                  <Button
                    className="shrink-0 self-end sm:self-auto"
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
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <SocialPointBadge
                      className="max-w-full"
                      title={title.title}
                      badgeColor={title.badge_color}
                    />
                    <span className="shrink-0 text-xs text-muted">{title.min_points}P 이상</span>
                  </div>
                  <Button
                    className="shrink-0 self-end sm:self-auto"
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
    </div>
  );
}

export default function ProfilePage() {
  const { isLoading, needsLogin, login } = useAuthSession();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 text-center text-muted">불러오는 중...</div>
    );
  }

  if (needsLogin) {
    return <ProfileGuestGate onLogin={login} />;
  }

  return <ProfileMemberContent />;
}
