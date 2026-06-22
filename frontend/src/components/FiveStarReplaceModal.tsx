"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FiveStarPlaceItem } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

interface FiveStarReplaceModalProps {
  open: boolean;
  targetPlaceName: string;
  existingPlaces: FiveStarPlaceItem[];
  onCancel: () => void;
  onConfirm: (replacePlaceId: string) => void;
}

export function FiveStarReplaceModal({
  open,
  targetPlaceName,
  existingPlaces,
  onCancel,
  onConfirm,
}: FiveStarReplaceModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
        role="dialog"
        aria-labelledby="replace-modal-title"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warm" />
          <div>
            <h2 id="replace-modal-title" className="text-lg font-semibold text-foreground">
              5점을 바꿀까요?
            </h2>
            <p className="mt-2 text-sm text-muted">
              5점은 최대 5곳까지만 줄 수 있어요.{" "}
              <strong className="text-foreground">{targetPlaceName}</strong>에 5점을 주려면, 아래
              중 하나의 5점을 취소(4점으로 변경)해야 합니다.
            </p>
          </div>
        </div>

        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
          {existingPlaces.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                onClick={() => setSelected(place.place_id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  selected === place.place_id
                    ? "border-warm bg-warm/10 text-foreground"
                    : "border-border bg-surface text-muted hover:border-warm/40"
                }`}
              >
                {place.place_name}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            취소
          </Button>
          <Button disabled={!selected} onClick={() => selected && onConfirm(selected)}>
            5점 교체하기
          </Button>
        </div>
      </div>
    </div>
  );
}
