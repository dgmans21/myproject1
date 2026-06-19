"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  api,
  Appointment,
  VoteSummary,
  TimeSlotSummary,
  STATUS_LABELS,
} from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import { ArrowLeft, Check, Clock, CalendarDays } from "lucide-react";
import Link from "next/link";

const TIME_SLOTS = ["11:00", "12:00", "13:00", "17:00", "18:00", "19:00", "20:00"];

function getNextDates(count: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export default function AppointmentPage() {
  const { id: groupId, appointmentId } = useParams<{ id: string; appointmentId: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [dateSummary, setDateSummary] = useState<VoteSummary[]>([]);
  const [timeSummary, setTimeSummary] = useState<TimeSlotSummary[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedSlots, setSelectedSlots] = useState<Map<string, number>>(new Map());
  const dates = getNextDates(14);

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
    } catch { /* API not ready */ }
  };

  useEffect(() => { load(); }, [appointmentId]);

  const toggleDate = (d: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const submitDateVotes = async () => {
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
    for (const [key, priority] of selectedSlots) {
      const [vote_date, vote_time] = key.split("|");
      await api.appointments.submitTimeVote(appointmentId, { vote_date, vote_time, priority });
    }
    await load();
  };

  const confirmAppointment = async (voteDate: string, voteTime: string) => {
    await api.appointments.confirm(appointmentId, voteDate, voteTime);
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
          <ArrowLeft className="h-4 w-4" /> 그룹으로
        </Link>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{appointment.title}</h1>
          <Badge variant="primary">{STATUS_LABELS[appointment.status]}</Badge>
        </div>

        {appointment.status === "confirmed" && (
          <Card className="mt-6 border-accent/30 bg-accent/5">
            <div className="flex items-center gap-3">
              <Check className="h-6 w-6 text-accent" />
              <div>
                <CardTitle>약속 확정!</CardTitle>
                <p className="text-sm text-muted mt-1">
                  {formatDate(appointment.confirmed_date!)} {formatTime(appointment.confirmed_time!)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Phase 1: Date Voting */}
        {appointment.status === "date_voting" && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">1차 날짜 투표</h2>
            </div>
            <p className="text-sm text-muted">가능한 날짜를 모두 선택해주세요</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDate(d)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                    selectedDates.has(d)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {formatDate(d)}
                </button>
              ))}
            </div>

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
                  2차 시간 투표로 진행
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Phase 2: Time Voting */}
        {appointment.status === "time_voting" && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold">2차 시간 투표</h2>
            </div>
            <p className="text-sm text-muted">선호하는 시간대를 선택하세요 (최대 3개, 1순위부터)</p>

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

            {timeSummary.length > 0 && (
              <Card>
                <CardTitle>시간대별 결과</CardTitle>
                <div className="mt-4 space-y-2">
                  {timeSummary.slice(0, 10).map((s) => (
                    <div key={`${s.vote_date}-${s.vote_time}`} className="flex items-center justify-between text-sm">
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
    </div>
  );
}
