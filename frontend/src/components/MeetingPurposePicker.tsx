"use client";

import { Button } from "@/components/ui/Button";
import {
  MEETING_PURPOSE_OPTIONS,
  type MeetingPurposeId,
  type MeetingPurposeValue,
} from "@/lib/meeting-purpose";
import { cn } from "@/lib/utils";

interface MeetingPurposePickerProps {
  value: MeetingPurposeValue;
  customDraft: string;
  onChange: (next: MeetingPurposeValue) => void;
  onCustomDraftChange: (text: string) => void;
  onSaveOther?: () => void;
  readOnly?: boolean;
  saving?: boolean;
  className?: string;
}

export function MeetingPurposePicker({
  value,
  customDraft,
  onChange,
  onCustomDraftChange,
  onSaveOther,
  readOnly = false,
  saving = false,
  className = "",
}: MeetingPurposePickerProps) {
  const selectPurpose = (id: MeetingPurposeId) => {
    if (readOnly) return;
    onChange({
      purpose: id,
      purpose_custom: id === "OTHER" ? customDraft : undefined,
    });
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
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
            onChange={(e) => onCustomDraftChange(e.target.value)}
            placeholder="기타 목적 입력"
            className="min-w-[12rem] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSaveOther?.();
              }
            }}
          />
          {onSaveOther && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onSaveOther}
              disabled={saving || !customDraft.trim()}
            >
              저장
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
