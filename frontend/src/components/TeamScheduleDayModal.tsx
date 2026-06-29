"use client";

import { Button } from "@/components/ui/Button";
import { TeamScheduleDayMemo } from "@/lib/api";
import { X } from "lucide-react";

interface TeamScheduleDayModalProps {
  open: boolean;
  dateKey: string;
  memos: TeamScheduleDayMemo[];
  myMemo: string;
  readOnly?: boolean;
  saving?: boolean;
  onClose: () => void;
  onMyMemoChange: (value: string) => void;
  onSave: () => void;
}

export function TeamScheduleDayModal({
  open,
  dateKey,
  memos,
  myMemo,
  readOnly = false,
  saving = false,
  onClose,
  onMyMemoChange,
  onSave,
}: TeamScheduleDayModalProps) {
  if (!open) return null;

  const label = dateKey.replace(/-/g, ". ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-schedule-day-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="team-schedule-day-title" className="text-lg font-semibold text-foreground">
            {label} 일정
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {memos.length === 0 ? (
            <p className="text-sm text-muted">아직 등록된 메모가 없습니다.</p>
          ) : (
            memos.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-surface/50 p-3">
                <p className="text-sm font-medium text-foreground">{m.display_name}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{m.memo}</p>
              </div>
            ))
          )}
        </div>

        {!readOnly && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">내 메모</p>
            <textarea
              value={myMemo}
              onChange={(e) => onMyMemoChange(e.target.value)}
              rows={3}
              placeholder="이 날 일정·메모를 남겨 보세요"
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={onClose}>
                닫기
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? "저장 중…" : "저장"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
