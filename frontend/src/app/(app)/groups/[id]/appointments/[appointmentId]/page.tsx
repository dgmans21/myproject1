"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VoteMonthCalendar } from "@/components/VoteMonthCalendar";
import { GuestPromptModal } from "@/components/GuestPromptModal";
import type { WriteAction } from "@/lib/permissions";
import { isGuestSession } from "@/lib/auth-session";
import { PlaceVotePanel } from "@/components/PlaceVotePanel";
import { AppointmentBriefingPanel } from "@/components/AppointmentBriefingPanel";
import {
  api,
  Appointment,
  MeetingSettlement,
  Place,
  VoteSummary,
  TimeSlotSummary,
  STATUS_LABELS,
} from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";

const TIME_SLOTS = ["11:00", "12:00", "13:00", "17:00", "18:00", "19:00", "20:00"];

export default function AppointmentPage() {
  const { id: groupId, appointmentId } = useParams<{ id: string; appointmentId: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [dateSummary, setDateSummary] = useState<VoteSummary[]>([]);
  const [timeSummary, setTimeSummary] = useState<TimeSlotSummary[]>([]);
  const [confirmedPlace, setConfirmedPlace] = useState<Place | null>(null);
  const [settlement, setSettlement] = useState<MeetingSettlement | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number; name?: string } | undefined>();
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedSlots, setSelectedSlots] = useState<Map<string, number>>(new Map());
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState(false);
  const [guestAction, setGuestAction] = useState<WriteAction>("schedule_write");
  const readOnly = isGuestSession();

  const load = async () => {
    if (!appointmentId) return;
    try {
      const apt = await api.appointments.get(appointmentId);
      setAppointment(apt);
      if (apt.status === "date_voting" || apt.status === "time_voting") {
        const ds = await api.appointments.dateSummary(appointmentId);
        setDateSummary(ds);
      }
      if (apt.status === "time_voting" || apt.status === "confirmed") {
        const ts = await api.appointments.timeSummary(appointmentId);
        setTimeSummary(ts);
      }
      if (apt.status === "confirmed") {
        if (apt.confirmed_place_id) {
          const p = await api.places.get(apt.confirmed_place_id);
          setConfirmedPlace(p);
        }
        const s = await api.appointments.settlement(appointmentId);
        setSettlement(s);
      }
    } catch { /* mock fallback */ }
  };

  useEffect(() => {
    api.profiles.me().then((p) => {
      if (p.home_lat != null && p.home_lng != null) {
        setOrigin({ lat: p.home_lat, lng: p.home_lng, name: p.display_name });
      } else {
        setOrigin({ lat: 37.4979, lng: 127.0276, name: p.display_name });
      }
    }).catch(() => {
      setOrigin({ lat: 37.4979, lng: 127.0276, name: "출발" });
    });
  }, []);

  useEffect(() => { load(); }, [appointmentId]);

  useEffect(() => {
    if (!groupId) return;
    api.rooms.members(groupId).then((members) => {
      setIsRoomOwner(members.some((m) => m.is_me && m.role === "OWNER"));
    }).catch(() => {});
  }, [groupId]);

  const toggleDate = (d: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const promptGuest = (action: WriteAction) => {
    setGuestAction(action);
    setGuestPrompt(true);
  };

  const submitDateVotes = async () => {
    if (readOnly) {
      promptGuest("schedule_write");
      return;
    }
    for (const d of selectedDates) {
      await api.appointments.submitDateVote(appointmentId, { vote_date: d, is_available: true });
    }
    await load();
  };

  const advancePhase = async () => {
    await api.appointments.advanceToTimeVote(appointmentId);
    await load();
  };

  const submitTimeVotes = async () => {
    if (readOnly) {
      promptGuest("schedule_write");
      return;
    }
    for (const [key, priority] of selectedSlots) {
      const [vote_date, vote_time] = key.split("|");
      await api.appointments.submitTimeVote(appointmentId, { vote_date, vote_time, priority });
    }
    await load();
  };

  const confirmAppointment = async (voteDate: string, voteTime: string) => {
    if (!selectedPlaceId) {
      alert("확정할 장소를 선택해주세요.");
      return;
    }
    await api.appointments.confirm(appointmentId, voteDate, voteTime, selectedPlaceId);
    await load();
  };

  if (!appointment) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-8 text-center text-muted">불러오는 중...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href={`/groups/${groupId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> 방으로
        </Link>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{appointment.title}</h1>
          </div>
          {appointment.status === "confirmed" ? (
            <p className="mt-1 text-sm text-muted">확정된 약속 · 당일 브리핑</p>
          ) : (
            <Badge className="mt-2" variant="primary">
              {STATUS_LABELS[appointment.status]}
            </Badge>
          )}
        </div>

        {appointment.status === "confirmed" && (
          <div className="mt-6">
            <AppointmentBriefingPanel
              roomId={groupId!}
              appointment={appointment}
              place={confirmedPlace}
              settlement={settlement}
              isRoomOwner={isRoomOwner}
              readOnly={readOnly}
              onRequireAuth={() => promptGuest("comment_write")}
            />
          </div>
        )}

        {appointment.status === "date_voting" && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">1차 날짜 투표</h2>
              <p className="mt-1 text-sm text-muted">
                가능한 날짜를 선택한 뒤 투표를 제출하세요.
              </p>
            </div>

            <VoteMonthCalendar
              selectedDates={selectedDates}
              onToggleDate={toggleDate}
              voteSummary={dateSummary}
            />

            <Button onClick={submitDateVotes} disabled={selectedDates.size === 0}>
              투표 제출 ({selectedDates.size}일)
            </Button>

            {dateSummary.length > 0 && (
              <Card>
                <CardTitle>날짜별 참여 현황</CardTitle>
                <div className="mt-4 space-y-2">
                  {dateSummary.map((s) => (
                    <div key={s.vote_date} className="flex items-center justify-between text-sm">
                      <span>{formatDate(s.vote_date)}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 rounded-full bg-surface overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${s.availability_rate}%` }}
                          />
                        </div>
                        <span className="text-muted w-16 text-right">
                          {s.available_count}/{s.total_members}명
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="mt-4" variant="accent" onClick={advancePhase}>
                  2차 시간·장소 투표로 진행
                </Button>
              </Card>
            )}
          </div>
        )}

        {appointment.status === "time_voting" && (
          <div className="mt-8 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold">2차 시간 투표</h2>
              </div>
              <p className="text-sm text-muted">선호 시간대 최대 3개 (1순위부터)</p>

              {dateSummary.slice(0, 5).map((s) => (
                <div key={s.vote_date}>
                  <h3 className="text-sm font-medium text-foreground mb-2">{formatDate(s.vote_date)}</h3>
                  <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map((t) => {
                      const key = `${s.vote_date}|${t}`;
                      const priority = selectedSlots.get(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedSlots((prev) => {
                              const next = new Map(prev);
                              if (next.has(key)) next.delete(key);
                              else if (next.size < 3) next.set(key, next.size + 1);
                              return next;
                            });
                          }}
                          className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                            priority
                              ? "border-accent bg-accent/10 text-accent font-bold"
                              : "border-border bg-card hover:border-accent/40"
                          }`}
                        >
                          {t} {priority ? `#${priority}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <Button onClick={submitTimeVotes} disabled={selectedSlots.size === 0}>
                시간 투표 제출
              </Button>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">장소 후보 · 지도 · 이동 시간</h2>
              <PlaceVotePanel
                roomId={appointment.room_id}
                appointmentId={appointment.id}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={setSelectedPlaceId}
                origin={origin}
              />
            </section>

            {timeSummary.length > 0 && (
              <Card>
                <CardTitle>일정 확정</CardTitle>
                <p className="mt-1 text-sm text-muted">장소를 선택한 뒤 시간대를 확정하세요</p>
                <div className="mt-4 space-y-2">
                  {timeSummary.slice(0, 10).map((s) => (
                    <div key={`${s.vote_date}-${s.vote_time}`} className="flex items-center justify-between text-sm gap-2 flex-wrap">
                      <span>{formatDate(s.vote_date)} {formatTime(s.vote_time)}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="accent">{s.vote_count}표</Badge>
                        <Badge>{s.total_score}점</Badge>
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => confirmAppointment(s.vote_date, s.vote_time)}
                        >
                          확정
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </main>

      <GuestPromptModal
        open={guestPrompt}
        action={guestAction}
        onClose={() => setGuestPrompt(false)}
      />
    </div>
  );
}
