"use client";

import { useEffect, useState } from "react";
import { api, MeetingPurposeSetting } from "@/lib/api";
import { meetingPurposeLabel } from "@/lib/meeting-purpose";
import { MeetingPurposePicker } from "@/components/MeetingPurposePicker";
import { Target } from "lucide-react";

interface MeetingPurposeSelectorProps {
  roomId: string;
  readOnly?: boolean;
}

/** 일반 모임방 — 모임 주목적 (방 상세에서 수정) */
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

  const handleChange = (next: MeetingPurposeSetting) => {
    setValue(next);
    if (next.purpose && next.purpose !== "OTHER") {
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

      <MeetingPurposePicker
        className="mt-3"
        value={value}
        customDraft={customDraft}
        onChange={handleChange}
        onCustomDraftChange={setCustomDraft}
        onSaveOther={saveOther}
        readOnly={readOnly}
        saving={saving}
      />
    </div>
  );
}
