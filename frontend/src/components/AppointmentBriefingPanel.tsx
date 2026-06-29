"use client";

import { useCallback, useEffect, useState } from "react";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { MeetingSettlementWidget } from "@/components/MeetingSettlementWidget";
import { RoomPraisePanel } from "@/components/RoomPraisePanel";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  api,
  Appointment,
  AppointmentBriefing,
  MeetingSettlement,
  Place,
  Profile,
  TIER_LABELS,
} from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";
import { canDeleteContent } from "@/lib/permissions";
import { formatCountdown, formatDDay } from "@/lib/appointment-time";
import { formatDate, formatTime } from "@/lib/utils";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Flag,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Trash2,
} from "lucide-react";

interface AppointmentBriefingPanelProps {
  roomId: string;
  appointment: Appointment;
  place: Place | null;
  settlement: MeetingSettlement | null;
  isRoomOwner?: boolean;
  readOnly?: boolean;
  onRequireAuth?: () => void;
}

const PUNCTUALITY_LABEL = {
  ok: { emoji: "🟢", text: "여유" },
  risk: { emoji: "🟡", text: "지각 위험" },
  late: { emoji: "🔴", text: "지각 예상" },
  unknown: { emoji: "⚪", text: "출발 전" },
} as const;

export function AppointmentBriefingPanel({
  roomId,
  appointment,
  place,
  settlement,
  isRoomOwner,
  readOnly = isGuestSession(),
  onRequireAuth,
}: AppointmentBriefingPanelProps) {
  const [briefing, setBriefing] = useState<AppointmentBriefing | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);

  const reload = useCallback(async () => {
    const data = await api.appointments.briefing(appointment.id);
    setBriefing(data);
  }, [appointment.id]);

  useEffect(() => {
    reload().catch(() => {});
    api.profiles.me().then(setProfile).catch(() => {});
    const timer = setInterval(() => {
      reload().catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [reload]);

  const handlePostComment = async () => {
    if (readOnly) {
      onRequireAuth?.();
      return;
    }
    if (!commentDraft.trim()) return;
    setPosting(true);
    try {
      await api.appointments.addComment(appointment.id, commentDraft);
      setCommentDraft("");
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "댓글 등록 실패");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
    try {
      await api.appointments.deleteComment(appointment.id, commentId);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "댓글 삭제 실패");
    }
  };

  const handleDeparture = async () => {
    try {
      await api.appointments.setDepartureStatus(appointment.id, "EN_ROUTE");
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "상태 변경 실패");
    }
  };

  if (!briefing || !appointment.confirmed_date || !appointment.confirmed_time) {
    return <p className="text-sm text-muted">브리핑 불러오는 중...</p>;
  }

  const meetingEnded = briefing.meeting_ended;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 to-primary/5 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold text-foreground">약속 확정 브리핑</h2>
          </div>
          <Badge variant="accent">{formatDDay(appointment.confirmed_date)}</Badge>
        </div>
        <p className="mt-1 text-sm font-medium text-foreground">&quot;{briefing.title}&quot;</p>
      </div>

      {/* Top: 확정 정보 (당일 브리핑 상단 — 모임 종료 후 정산은 맨 아래) */}
      <Card>
        <CardTitle className="text-base">최종 확정 정보</CardTitle>
        <CardDescription className="mt-1">
          아래 장소·일시가 2차 투표로 확정된 내용입니다. (위 제목은 약속 이름)
        </CardDescription>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <p>
            <span className="text-muted">📍 장소</span>
            <br />
            <strong className="text-foreground">{briefing.place_name || "—"}</strong>
          </p>
          <p>
            <span className="text-muted">📅 일시</span>
            <br />
            <strong className="text-foreground">
              {formatDate(appointment.confirmed_date)}{" "}
              {formatTime(appointment.confirmed_time)}
            </strong>
          </p>
          <p>
            <span className="text-muted">⏱️ 남은 시간</span>
            <br />
            <strong className="text-accent">
              {briefing.minutes_until_start > 0
                ? formatCountdown(briefing.minutes_until_start)
                : meetingEnded
                  ? "모임 종료"
                  : "진행 중"}
            </strong>
          </p>
        </div>
        {place && (
          <p className="mt-2 text-xs text-muted">{briefing.place_address}</p>
        )}
        <p className="mt-3 text-xs text-muted border-t border-border pt-3">
          확정된 장소·일시는 투표 결과라 여기서는 수정할 수 없습니다.
        </p>
      </Card>

      {/* Middle: 멤버별 출발 현황 */}
      <Card>
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          멤버별 실시간 출발 현황
        </CardTitle>
        <CardDescription className="mt-1">
          확정 시 각 멤버 출발지 기준 이동시간을 기록합니다. 출발 후 ETA가 갱신됩니다.
        </CardDescription>
        <ul className="mt-4 space-y-3">
          {briefing.members.map((m) => {
            const p = PUNCTUALITY_LABEL[m.punctuality];
            return (
              <li
                key={m.user_id}
                className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    👤 {m.display_name}
                    {m.is_me && <span className="ml-1 text-xs text-muted">(나)</span>}
                  </span>
                  <span className="text-xs">
                    {p.emoji} {p.text}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  출발지: {m.origin_label}
                  {m.departure_status === "EN_ROUTE" && m.estimated_arrival ? (
                    <>
                      {" "}
                      ➡️ 예상 도착: <strong className="text-foreground">{m.estimated_arrival}</strong>
                      {m.duration_minutes != null && (
                        <span className="ml-1">(약 {m.duration_minutes}분)</span>
                      )}
                    </>
                  ) : (
                    <> ➡️ (아직 출발 전)</>
                  )}
                </p>
                {m.is_me && m.departure_status === "NOT_DEPARTED" && !meetingEnded && (
                  <Button size="sm" variant="secondary" className="mt-2" onClick={handleDeparture}>
                    출발했어요
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {meetingEnded && (
          <p className="mt-3 text-xs text-muted">
            모임 종료 후에는 출발 상태를 바꿀 수 없습니다.
          </p>
        )}
      </Card>

      {/* Main: 당일 댓글 */}
      <Card>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-warm" />
          실시간 당일 소통
        </CardTitle>
        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
          {briefing.comments.length === 0 ? (
            <p className="text-sm text-muted">아직 댓글이 없습니다. 첫 메시지를 남겨보세요!</p>
          ) : (
            briefing.comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-surface/60 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-foreground">
                    <strong>{c.display_name}</strong>: {c.body}
                  </p>
                  {profile && canDeleteContent(Boolean(c.is_me), profile) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      className="shrink-0 text-muted hover:text-warm"
                      aria-label="댓글 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {new Date(c.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))
          )}
        </div>
        {!meetingEnded && !readOnly ? (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
            />
            <Button size="sm" disabled={posting || !commentDraft.trim()} onClick={handlePostComment}>
              등록
            </Button>
          </div>
        ) : !meetingEnded && readOnly ? (
          <p className="mt-4 text-sm text-muted">
            비회원은 댓글을 조회만 할 수 있습니다. 작성하려면 로그인해 주세요.
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">
            모임이 종료되어 당일 댓글 입력은 마감되었습니다. 아래 정산/칭찬을 이용하세요.
          </p>
        )}
      </Card>

      {/* 지도 접기/펼치기 */}
      {place && (
        <Card>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowMap(!showMap)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              확정 장소 지도
            </CardTitle>
            {showMap ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showMap && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="tier" tier={place.tier}>
                  {TIER_LABELS[place.tier]}
                </Badge>
                <span className="font-semibold">{place.name}</span>
              </div>
              <KakaoMapLinks place={place} />
              <KakaoMap
                markers={[{ id: place.id, name: place.name, lat: place.lat, lng: place.lng }]}
                center={{ lat: place.lat, lng: place.lng }}
                level={3}
                height={280}
                useClusterer={false}
              />
            </div>
          )}
        </Card>
      )}

      {/* Bottom: 모임 종료 후 정산 */}
      <Card className="border-dashed">
        {meetingEnded ? (
          <div className="space-y-4">
            <Button
              variant="accent"
              className="w-full"
              onClick={() => setSettlementOpen(!settlementOpen)}
            >
              <Calendar className="h-4 w-4" />
              {settlementOpen ? "정산 영역 접기" : "모임 종료 · 정산/칭찬 투표하러 가기"}
            </Button>
            {settlementOpen && (
              <div className="space-y-4 border-t border-border pt-4">
                <MeetingSettlementWidget settlement={settlement} />
                <RoomPraisePanel
                  roomId={roomId}
                  appointmentId={appointment.id}
                  isOwner={isRoomOwner}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              모임 종료 및 정산/칭찬 투표는 약속 시간 이후(약 3시간) 활성화됩니다.
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
