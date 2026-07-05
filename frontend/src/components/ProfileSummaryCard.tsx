"use client";

import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ProfileBadgeBorder, TrustBadge } from "@/components/ProfileBadgeBorder";
import { SocialPointBadge } from "@/components/SocialPointBadge";
import { MbtiBadge } from "@/components/MbtiBadge";
import { ProfileDecorBadges } from "@/components/ProfileDecorBadges";
import { ProfileThemeShell } from "@/components/ProfileThemeShell";
import type { PublicProfileView, RecommenderTitle, SocialPointTitle } from "@/lib/api";
import { AGE_LABELS } from "@/lib/profile-labels";
import { resolveProfileThemeStyle } from "@/lib/profile-theme";

interface ProfileSummaryCardProps {
  profile: PublicProfileView;
  showStats?: boolean;
  showRankingLink?: boolean;
  bordered?: boolean;
}

function resolveActiveTrustTitle(profile: PublicProfileView): RecommenderTitle | undefined {
  const fromList =
    profile.available_titles?.find((t) => t.id === profile.selected_title_id)
    ?? profile.available_titles?.[profile.available_titles.length - 1];
  if (fromList) return fromList;
  if (!profile.trust_title) return undefined;
  return {
    id: profile.selected_title_id ?? 0,
    title: profile.trust_title,
    badge_color: profile.trust_badge_color ?? "#94A3B8",
    border_style: "none",
    min_score: 0,
  };
}

function resolveActiveSocialTitle(profile: PublicProfileView): SocialPointTitle | undefined {
  const fromList =
    profile.available_social_titles?.find((t) => t.id === profile.selected_social_title_id)
    ?? profile.available_social_titles?.filter((t) => t.min_points <= profile.social_points).slice(-1)[0];
  if (fromList) return fromList;
  if (!profile.social_title) return undefined;
  return {
    id: profile.selected_social_title_id ?? 0,
    title: profile.social_title,
    badge_color: profile.social_badge_color ?? "#94A3B8",
    border_style: "none",
    min_points: 0,
  };
}

/** 마이페이지 헤더 · 프로필 모달 공용 요약 카드 */
export function ProfileSummaryCard({
  profile,
  showStats = true,
  showRankingLink = false,
  bordered = true,
}: ProfileSummaryCardProps) {
  const activeTrustTitle = resolveActiveTrustTitle(profile);
  const activeSocialTitle = resolveActiveSocialTitle(profile);
  const profileAccent = resolveProfileThemeStyle(profile.profile_decor).accent;
  const statusMessage = profile.status_message?.trim();

  const inner = (
    <ProfileBadgeBorder
      borderStyle={activeTrustTitle?.border_style ?? activeSocialTitle?.border_style}
      badgeTier={profile.badge_tier}
    >
      <Card className="border-0 bg-transparent p-4 shadow-none sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
              <span style={{ color: profileAccent }}>{profile.display_name}</span>
              <ProfileDecorBadges decor={profile.profile_decor} size={16} />
            </CardTitle>
            <CardDescription className="mt-1">
              {AGE_LABELS[profile.age_group] ?? profile.age_group} · {profile.residence}
              {profile.role === "ADMIN" && (
                <span className="ml-2 rounded-md bg-warm/15 px-2 py-0.5 text-xs font-medium text-warm">
                  관리자
                </span>
              )}
            </CardDescription>
            {statusMessage && (
              <p className="mt-2 line-clamp-2 break-keep text-sm text-foreground/90">
                {statusMessage}
              </p>
            )}
            {profile.mbti_types.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.mbti_types.map((t) => (
                  <MbtiBadge key={t} type={t} />
                ))}
              </div>
            )}
          </div>
          {(activeTrustTitle || activeSocialTitle) && (
            <div className="flex min-w-0 flex-wrap gap-2">
              {activeTrustTitle && (
                <TrustBadge
                  className="max-w-full"
                  title={activeTrustTitle.title}
                  badgeColor={activeTrustTitle.badge_color}
                />
              )}
              {activeSocialTitle && (
                <SocialPointBadge
                  className="max-w-full"
                  title={activeSocialTitle.title}
                  badgeColor={activeSocialTitle.badge_color}
                />
              )}
            </div>
          )}
        </div>
        {showStats && (
          <p className="mt-4 text-sm text-muted">
            신뢰도 <strong className="text-foreground">{profile.trust_score}</strong>점
            · 소셜 <strong className="text-foreground">{profile.social_points}</strong>P
            · 장소 채택 {profile.places_adopted_count}회
            {showRankingLink && (
              <>
                {" "}
                ·{" "}
                <Link href="/ranking" className="text-primary underline">
                  랭킹 보기
                </Link>
              </>
            )}
          </p>
        )}
      </Card>
    </ProfileBadgeBorder>
  );

  if (!bordered) return inner;

  return (
    <ProfileThemeShell decor={profile.profile_decor}>
      {inner}
    </ProfileThemeShell>
  );
}
