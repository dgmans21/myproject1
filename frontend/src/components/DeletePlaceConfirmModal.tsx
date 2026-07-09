"use client";

import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";

interface DeletePlaceConfirmModalProps {
  open: boolean;
  placeName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeletePlaceConfirmModal({
  open,
  placeName,
  onCancel,
  onConfirm,
}: DeletePlaceConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
        role="dialog"
        aria-labelledby="delete-place-modal-title"
      >
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <h2 id="delete-place-modal-title" className="text-lg font-semibold text-foreground">
              맛집을 삭제할까요?
            </h2>
            <p className="mt-2 text-sm text-muted">
              <strong className="text-foreground">{placeName}</strong>을(를) 삭제하면 이 장소의
              평가·리뷰·추천 투표도 함께 삭제됩니다. 되돌릴 수 없습니다.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            취소
          </Button>
          <Button
            className="border-2 border-red-800 bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}
