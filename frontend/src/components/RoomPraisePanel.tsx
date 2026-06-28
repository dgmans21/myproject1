"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { MbtiBadge } from "@/components/MbtiBadge";
import { ProfileDecorBadges } from "@/components/ProfileDecorBadges";
import { SocialPointBadge } from "@/components/SocialPointBadge";
import { api, PraiseSticker, PraiseVoteStatus, RoomMember } from "@/lib/api";
import { PRAISE_STICKER_LABELS } from "@/lib/social-points";
import { Heart } from "lucide-react";

const STICKERS: PraiseSticker[] = [
  "PUNCTUAL",
  "MOOD_MAKER",
  "GOOD_LISTENER",
  "TEAM_PLAYER",
  "LIFE_OF_PARTY",
];

interface RoomPraisePanelProps {
  roomId: string;
  appointmentId: string;
  isOwner?: boolean;
}

export function RoomPraisePanel({ roomId, appointmentId, isOwner }: RoomPraisePanelProps) {
  const [status, setStatus] = useState<PraiseVoteStatus | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<PraiseSticker>("MOOD_MAKER");
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    const [s, m] = await Promise.all([
      api.rooms.praiseStatus(roomId, appointmentId),
      api.rooms.members(roomId),
    ]);
    setStatus(s);
    setMembers(m);
  }, [roomId, appointmentId]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const handleSubmit = async () => {
    if (!selectedTarget) return;
    setSubmitting(true);
    try {
      await api.rooms.submitPraise(roomId, appointmentId, {
        target_user_id: selectedTarget,
        sticker: selectedSticker,
      });
      setSelectedTarget(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "스티커 전송 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTravelReward = async (targetUserId: string) => {
    if (!confirm("가장 멀리서 온 멤버에게 10포인트를 지급할까요?")) return;
    try {
      await api.rooms.travelReward(roomId, appointmentId, targetUserId);
      await reload();
      alert("10포인트가 지급되었습니다");
    } catch (err) {
      alert(err instanceof Error ? err.message : "리워드 지급 실패");
    }
  };

  if (!status) return null;

  return (
    <Card className="mt-6">
      <CardTitle className="flex items-center gap-2 text-base">
        <Heart className="h-4 w-4 text-warm" /> 칭찬 스티커
      </CardTitle>
      <CardDescription className="mt-1">
        멤버에게 스티커를 보내면 <strong className="text-foreground">5포인트</strong>가 쌓입니다.
        누가 누구에게 보냈는지는 공개되지 않습니다 (블라인드).
      </CardDescription>

      {status.my_votes.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          내가 보낸 스티커: {status.my_votes.length}명 · +{status.my_votes.length * 5}P 반영됨
        </p>
      )}

      {status.pending_targets.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-foreground">스티커 보낼 멤버</p>
          <div className="flex flex-wrap gap-2">
            {status.pending_targets.map((t) => (
              <button
                key={t.user_id}
                type="button"
                onClick={() => setSelectedTarget(t.user_id)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  selectedTarget === t.user_id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary/40"
                }`}
              >
                {t.display_name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {STICKERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSticker(s)}
                className={`rounded-lg px-2 py-1 text-xs ${
                  selectedSticker === s ? "bg-warm/20 text-warm font-semibold" : "bg-surface text-muted"
                }`}
              >
                {PRAISE_STICKER_LABELS[s]}
              </button>
            ))}
          </div>
          <Button size="sm" disabled={!selectedTarget || submitting} onClick={handleSubmit}>
            스티커 보내기 (+5P)
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-accent">모든 멤버에게 스티커를 보냈습니다</p>
      )}

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">멤버 소셜 포인트</p>
        <ul className="mt-2 space-y-2">
          {members.filter((m) => !m.is_me).map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium inline-flex items-center gap-1.5">
                {m.display_name}
                <ProfileDecorBadges decor={m.profile_decor} />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {m.mbti_types.map((t) => (
                  <MbtiBadge key={t} type={t} />
                ))}
                {m.social_title && (
                  <SocialPointBadge title={m.social_title} badgeColor={m.social_badge_color} />
                )}
                <span className="text-muted">{m.social_points}P</span>
                {isOwner && (
                  <Button size="sm" variant="ghost" onClick={() => handleTravelReward(m.user_id)}>
                    이동 +10P
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
