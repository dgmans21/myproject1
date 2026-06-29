"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { api, TeamScheduleDayMemo } from "@/lib/api";
import {
  buildMonthGrid,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/team-schedule-utils";
import { TeamScheduleDayModal } from "@/components/TeamScheduleDayModal";

interface TeamScheduleMonthViewProps {
  roomId: string;
  myUserId?: string;
  readOnly?: boolean;
}

export function TeamScheduleMonthView({
  roomId,
  myUserId,
  readOnly = false,
}: TeamScheduleMonthViewProps) {
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [memos, setMemos] = useState<TeamScheduleDayMemo[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [myMemoDraft, setMyMemoDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const data = await api.teamSchedule.listMonthMemos(roomId, view.year, view.month);
    setMemos(data);
  }, [roomId, view.year, view.month]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const memosByDate = useMemo(() => {
    const map = new Map<string, TeamScheduleDayMemo[]>();
    for (const m of memos) {
      const list = map.get(m.schedule_date) ?? [];
      list.push(m);
      map.set(m.schedule_date, list);
    }
    return map;
  }, [memos]);

  const cells = buildMonthGrid(view.year, view.month);
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const openDay = (dateKey: string) => {
    setModalDate(dateKey);
    const myEntry = memos.find((m) => m.schedule_date === dateKey && m.user_id === myUserId);
    setMyMemoDraft(myEntry?.memo ?? "");
  };

  const closeModal = () => {
    setModalDate(null);
    setMyMemoDraft("");
  };

  const saveMyMemo = async () => {
    if (!modalDate || readOnly) return;
    setSaving(true);
    try {
      await api.teamSchedule.upsertDayMemo(roomId, modalDate, myMemoDraft);
      await reload();
      closeModal();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const modalMemos = modalDate ? memosByDate.get(modalDate) ?? [] : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setView((v) => {
                const d = new Date(v.year, v.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
            className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface"
          >
            ←
          </button>
          <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
          <button
            type="button"
            onClick={() =>
              setView((v) => {
                const d = new Date(v.year, v.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
            className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface"
          >
            →
          </button>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={showPreview}
            onChange={(e) => setShowPreview(e.target.checked)}
            className="rounded border-border"
          />
          메모 간단히 보기
        </label>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const key = toDateKey(date);
          const dayMemos = memosByDate.get(key) ?? [];
          const hasMemos = dayMemos.length > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => openDay(key)}
              className={cn(
                "min-h-[4.5rem] rounded-xl border p-1 text-left transition-colors hover:border-primary/40",
                hasMemos ? "border-primary/30 bg-primary/5" : "border-border bg-surface/30"
              )}
            >
              <span className="text-xs font-semibold text-foreground">{date.getDate()}</span>
              {hasMemos && (
                <div className="mt-1 space-y-0.5">
                  {dayMemos.slice(0, 2).map((m) => (
                    <p key={m.id} className="truncate text-[10px] text-primary">
                      {m.display_name}
                    </p>
                  ))}
                  {dayMemos.length > 2 && (
                    <p className="text-[10px] text-muted">+{dayMemos.length - 2}</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {showPreview && memos.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {memos.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => openDay(m.schedule_date)}
                className="w-full rounded-xl border border-border bg-surface/40 px-3 py-2 text-left hover:border-primary/30"
              >
                <p className="text-xs text-muted">
                  {m.schedule_date.replace(/-/g, ".")} · {m.display_name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{m.memo}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <TeamScheduleDayModal
        open={modalDate != null}
        dateKey={modalDate ?? ""}
        memos={modalMemos}
        myMemo={myMemoDraft}
        readOnly={readOnly}
        saving={saving}
        onClose={closeModal}
        onMyMemoChange={setMyMemoDraft}
        onSave={saveMyMemo}
      />
    </div>
  );
}
