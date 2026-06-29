"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api, MeetingPurposeSetting } from "@/lib/api";
import {
  MEETING_PURPOSE_OPTIONS,
  type MeetingPurposeId,
  meetingPurposeLabel,
} from "@/lib/meeting-purpose";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";

interface MeetingPurposeSelectorProps {
  roomId: string;
  readOnly?: boolean;
}

/** 일반 모임방 — 이번 모임의 주목적 */
export function MeetingPurposeSelector({ roomId, readOnly = false }: MeetingPurposeSelectorProps) {
  const [value, setValue] = useState<MeetingPurposeSetting>({});
  const [customDraft, setCustomDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.rooms.getMeetingPurpose(roomId).then((v) => {
      setValue(v);
      setCustomDraft(v.purpose_custom ?? "");
    }).catch(() => {});
  }, [roomId]);

  const save = async (next: MeetingPurposeSetting) => {
    setSaving(true);
    try {
      const saved = await api.rooms.updateMeetingPurpose(roomId, next);
      setValue(saved);
      setCustomDraft(saved.purpose_custom ?? "");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const selectPurpose = (id: MeetingPurposeId) => {
    if (readOnly) return;
    const next: MeetingPurposeSetting = {
      purpose: id,
      purpose_custom: id === "OTHER" ? customDraft : undefined,
    };
    setValue(next);
    if (id !== "OTHER") {
      save(next).catch(() => {});
    }
  };

  const saveOther = () => {
    if (readOnly || value.purpose !== "OTHER") return;
    save({ purpose: "OTHER", purpose_custom: customDraft.trim() }).catch(() => {});
  };

  const label = meetingPurposeLabel(value);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Target className="h-4 w-4 text-primary" /> 모임 주목적
      </p>
      <p className="mt-1 text-xs text-muted">이번 모임의 분위기·기대치를 멤버와 맞춰 보세요.</p>

      {label && (
        <p className="mt-3 text-sm">
          현재: <strong className="text-primary">{label}</strong>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {MEETING_PURPOSE_OPTIONS.map((opt) => {
          const selected = value.purpose === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={readOnly || saving}
              onClick={() => selectPurpose(opt.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                  : "border-border text-muted hover:border-primary/40"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {value.purpose === "OTHER" && !readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            placeholder="기타 목적 입력"
            className="min-w-[12rem] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveOther();
              }
            }}
          />
          <Button size="sm" variant="secondary" onClick={saveOther} disabled={saving || !customDraft.trim()}>
            저장
          </Button>
        </div>
      )}
    </div>
  );
}
