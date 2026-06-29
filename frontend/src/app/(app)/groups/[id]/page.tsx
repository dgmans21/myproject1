"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { MbtiBadge } from "@/components/MbtiBadge";
import { ProfileDecorBadges, MEMBER_DECOR_DISPLAY_LIMIT } from "@/components/ProfileDecorBadges";
import { SocialPointBadge } from "@/components/SocialPointBadge";
import { RoomOutputBanner } from "@/components/RoomOutputBanner";
import { RoomHostTransferPanel } from "@/components/RoomHostTransferPanel";
import { RoomInvitePanel } from "@/components/RoomInvitePanel";
import { InviteLinkPanel } from "@/components/InviteLinkPanel";
import { RoomActionMenu } from "@/components/RoomActionMenu";
import { GuestPromptModal } from "@/components/GuestPromptModal";
import { MeetingPurposeSelector } from "@/components/MeetingPurposeSelector";
import { TeamScheduleRoomPanel } from "@/components/TeamScheduleRoomPanel";
import { api, Appointment, RoomMember, ROOM_TYPE_LABELS, STATUS_LABELS } from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";
import { useRoomStore } from "@/stores/room-store";
import { Plus, Calendar, ArrowLeft, Crown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GroupDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { currentRoom: room, roomHeatmap, fetchRoom, fetchRoomHeatmap, removeRoom } = useRoomStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const createFormRef = useRef<HTMLDivElement>(null);

  const reloadMembers = () => {
    if (!id) return;
    api.rooms.members(id).then(setMembers).catch(() => {});
  };

  useEffect(() => {
    if (!id) return;
    fetchRoom(id).catch(() => {});
    fetchRoomHeatmap(id).catch(() => {});
    api.appointments.listByRoom(id).then(setAppointments).catch(() => {});
    reloadMembers();
  }, [id, fetchRoom, fetchRoomHeatmap]);

  useEffect(() => {
    if (!showCreate) return;
    requestAnimationFrame(() => {
      createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("apt-create-title")?.focus();
    });
  }, [showCreate]);

  const heatmapData = roomHeatmap.map((d) => ({
    date: d.activity_on,
    count: d.event_count,
  }));

  const handleCreate = async () => {
    if (isGuestSession()) {
      setGuestPrompt(true);
      return;
    }
    if (!title.trim() || !id) return;
    setCreating(true);
    try {
      const apt = await api.appointments.create({
        room_id: id,
        title,
        description: description || undefined,
      });
      setAppointments((prev) => [apt, ...prev]);
      reloadMembers();
      setShowCreate(false);
      setTitle("");
      setDescription("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "약속 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const isTeamScheduleRoom = room?.room_type === "TEAM_SCHEDULE";
  const readOnly = isGuestSession();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> 방 목록
        </Link>

        {room && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {room.accent_color && (
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: room.accent_color }}
                    aria-hidden
                  />
                )}
                <h1 className="text-2xl font-bold text-foreground">{room.name}</h1>
                <Badge
                  variant={
                    room.room_type === "TEAM_SCHEDULE"
                      ? "accent"
                      : room.room_type === "REGULAR"
                        ? "primary"
                        : "warm"
                  }
                >
                  {ROOM_TYPE_LABELS[room.room_type]}
                </Badge>
              </div>
              {room.purpose && <p className="mt-1 text-muted">{room.purpose}</p>}
            </div>
            <div className="flex items-center gap-2">
              {!isTeamScheduleRoom && (
                <Button
                  onClick={() => {
                    if (isGuestSession()) setGuestPrompt(true);
                    else setShowCreate((open) => !open);
                  }}
                >
                  <Plus className="h-4 w-4" /> {showCreate ? "닫기" : "새 약속"}
                </Button>
              )}
              <RoomActionMenu
                room={room}
                onDelete={async (roomId) => {
                  await api.rooms.delete(roomId);
                  removeRoom(roomId);
                  router.push("/groups");
                }}
              />
            </div>
          </div>
        )}

        {showCreate && !isTeamScheduleRoom && (
          <div ref={createFormRef} className="mt-6 scroll-mt-24">
            <Card className="ring-2 ring-primary/20">
              <CardTitle>약속 만들기</CardTitle>
              <div className="mt-4 space-y-4">
                <Input
                  id="apt-create-title"
                  label="약속 제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="팀 회식"
                />
                <Textarea label="설명 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleCreate} disabled={creating || !title.trim()}>
                    약속 생성 & 1차 투표 시작
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>
                    취소
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {!isTeamScheduleRoom && (
          <div className="mt-6">
            <MeetingPurposeSelector roomId={id!} readOnly={readOnly} />
          </div>
        )}

        {!isTeamScheduleRoom && <RoomOutputBanner roomId={id!} appointments={appointments} />}

        {isTeamScheduleRoom && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">팀 일정 공유</h2>
            <p className="mt-1 text-sm text-muted">
              달력에 이름·메모를 남기고, 주간 표에서 가능한 시간을 공유하세요.
            </p>
            <div className="mt-4">
              <TeamScheduleRoomPanel roomId={id!} readOnly={readOnly} />
            </div>
          </div>
        )}

        <div className="mt-6">
          <RoomHostTransferPanel roomId={id!} onUpdated={reloadMembers} />
        </div>

        <RoomInvitePanel roomId={id!} />
        <InviteLinkPanel roomId={id!} isOwner={Boolean(room?.is_me_owner)} />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle className="text-base">방 활동 잔디</CardTitle>
            <CalendarHeatmap data={heatmapData} className="mt-4" weeks={8} />
          </Card>

          <Card>
            <CardTitle className="text-base">멤버</CardTitle>
            <ul className="mt-4 space-y-3">
              {members.map((m) => (
                <li key={m.user_id} className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium">
                    {m.display_name}
                    <ProfileDecorBadges
                      decor={m.profile_decor}
                      maxItems={MEMBER_DECOR_DISPLAY_LIMIT}
                    />
                    {m.is_me && <span className="text-xs text-muted">(나)</span>}
                    {m.role === "OWNER" && (
                      <Badge variant="warm" className="text-[10px] px-1.5 py-0">
                        <Crown className="h-3 w-3 mr-0.5" /> 방장
                      </Badge>
                    )}
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {m.mbti_types.map((t) => (
                      <MbtiBadge key={t} type={t} />
                    ))}
                    {m.social_title && (
                      <SocialPointBadge
                        className="max-w-full"
                        title={m.social_title}
                        badgeColor={m.social_badge_color}
                      />
                    )}
                    <span className="text-muted">{m.social_points}P</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {!isTeamScheduleRoom && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">약속 목록</h2>
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-10 w-10 text-muted/40" />
              <p className="mt-3 text-muted">아직 약속이 없습니다</p>
            </div>
          ) : (
            appointments.map((apt) => (
              <Link key={apt.id} href={`/groups/${id}/appointments/${apt.id}`}>
                <Card hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{apt.title}</CardTitle>
                      {apt.description && <CardDescription>{apt.description}</CardDescription>}
                    </div>
                    <Badge variant={
                      apt.status === "confirmed" ? "accent" :
                      apt.status === "date_voting" ? "primary" :
                      apt.status === "time_voting" ? "warm" : "default"
                    }>
                      {STATUS_LABELS[apt.status]}
                    </Badge>
                  </div>
                  {apt.confirmed_date && (
                    <p className="mt-2 text-sm text-accent font-medium">
                      {apt.confirmed_date} {apt.confirmed_time?.slice(0, 5)} 확정
                    </p>
                  )}
                </Card>
              </Link>
            ))
          )}
        </div>
        )}
      </main>

      <GuestPromptModal
        open={guestPrompt}
        action="schedule_write"
        onClose={() => setGuestPrompt(false)}
      />
    </div>
  );
}
