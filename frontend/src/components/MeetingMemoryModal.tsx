"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { ProfileNameButton } from "@/components/ProfileNameButton";
import { api, type MeetingMemoryListItem, type MeetingMemoryMemoItem } from "@/lib/api";
import { ROOM_TYPE_LABELS } from "@/lib/api";
import { BookOpen, CalendarDays, MapPin, X } from "lucide-react";
// import { MeetingPhotoUpload } from "@/components/MeetingPhotoUpload";

type MeetingMemoryModalProps = {
  open: boolean;
  item: MeetingMemoryListItem | null;
  onClose: () => void;
  onSaved?: () => void;
};

function formatMeetDate(date: string, time?: string) {
  try {
    const d = new Date(`${date}T${(time ?? "12:00:00").slice(0, 8)}`);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return date;
  }
}

function formatTime(time?: string) {
  if (!time) return "";
  return time.slice(0, 5);
}

/** 확정 약속 추억록 — 가볍게 남기는 간이 메모 모달 */
export function MeetingMemoryModal({ open, item, onClose, onSaved }: MeetingMemoryModalProps) {
  const [draft, setDraft] = useState("");
  const [others, setOthers] = useState<MeetingMemoryMemoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => {
    if (!open || !item) {
      setDraft("");
      setOthers([]);
      setSavedHint(false);
      return;
    }

    setLoading(true);
    Promise.all([
      api.appointments.listMeetingMemos(item.appointment_id),
    ])
      .then(([memos]) => {
        const mine = memos.find((m) => m.is_me);
        setDraft(mine?.body ?? item.my_memo_preview ?? "");
        setOthers(memos.filter((m) => !m.is_me));
      })
      .catch(() => {
        setDraft(item.my_memo_preview ?? "");
        setOthers([]);
      })
      .finally(() => setLoading(false));
  }, [open, item]);

  if (!open || !item) return null;

  const handleSave = async () => {
    setSaving(true);
    setSavedHint(false);
    try {
      await api.appointments.upsertMyMeetingMemo(item.appointment_id, draft);
      setSavedHint(true);
      onSaved?.();
      const memos = await api.appointments.listMeetingMemos(item.appointment_id);
      setOthers(memos.filter((m) => !m.is_me));
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const isTeam = item.room_type === "TEAM_SCHEDULE";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              {ROOM_TYPE_LABELS[item.room_type] ?? item.room_type} · {item.room_name}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{item.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatMeetDate(item.confirmed_date, item.confirmed_time)}
                {item.confirmed_time ? ` ${formatTime(item.confirmed_time)}` : ""}
              </span>
              {item.place_name && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {item.place_name}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-relaxed text-muted">
            {isTeam
              ? "간단한 회의 메모 정도면 충분해요. 꼭 남길 필요는 없어요."
              : "그날 있었던 일을 가볍게 적어두면 나중에 보기 좋아요. 안 써도 괜찮아요."}
          </p>

          <Textarea
            label={isTeam ? "간이 회의록" : "나의 한 줄 추억"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              isTeam
                ? "결정 사항, 다음 할 일, 분위기…"
                : "맛있었던 메뉴, 웃겼던 순간, 다음에 또 가고 싶은지…"
            }
            rows={5}
            maxLength={2000}
            disabled={loading || saving}
          />

          {/* 사진 첨부 — 스토리지 연동 후 아래 주석 해제
          <MeetingPhotoUpload appointmentId={item.appointment_id} disabled={loading || saving} />
          */}

          {others.length > 0 && (
            <section className="rounded-xl border border-border/80 bg-surface/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                함께 남긴 이야기
              </p>
              <ul className="space-y-3">
                {others.map((memo) => (
                  <li key={memo.id} className="text-sm">
                    <ProfileNameButton
                      userId={memo.user_id}
                      displayName={memo.display_name}
                      className="font-medium"
                    />
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
                      {memo.body}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <Link
            href={`/groups/${item.room_id}/appointments/${item.appointment_id}`}
            className="text-sm text-muted hover:text-foreground"
            onClick={onClose}
          >
            약속 상세 보기
          </Link>
          <div className="flex items-center gap-2">
            {savedHint && (
              <span className="text-xs text-muted">저장해 두었어요</span>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              닫기
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading || saving}>
              {saving ? "저장 중…" : "저장해 둘게요"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
