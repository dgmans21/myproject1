"use client";

import { Button } from "@/components/ui/Button";
import { PREMIUM_RATING_META } from "@/lib/place-ratings";
import { Info } from "lucide-react";

interface FourHalfStarConfirmModalProps {
  open: boolean;
  placeName: string;
  used: number;
  max: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 4.5점(나만의 맛집) 확정 전 확인 — 브라우저 alert 대신 모달 */
export function FourHalfStarConfirmModal({
  open,
  placeName,
  used,
  max,
  onCancel,
  onConfirm,
}: FourHalfStarConfirmModalProps) {
  if (!open) return null;

  const meta = PREMIUM_RATING_META[4.5];
  const remaining = Math.max(0, max - used);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
        role="dialog"
        aria-labelledby="four-half-modal-title"
      >
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-warm" />
          <div>
            <h2 id="four-half-modal-title" className="text-lg font-semibold text-foreground">
              {meta.label}으로 평가할까요?
            </h2>
            <p className="mt-2 text-sm text-muted">
              <strong className="text-foreground">{placeName}</strong>에 {meta.label}(4.5점)을
              주면 이번 달 남은 횟수가 1회 줄어요.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>
                이번 달 사용:{" "}
                <strong className="text-foreground">
                  {used}/{max}회
                </strong>{" "}
                (확정 후 {Math.max(0, used + 1)}/{max}회)
              </li>
              <li>
                남은 횟수: <strong className="text-foreground">{remaining}회</strong>
              </li>
              <li>
                다른 별점으로 바꾸거나 인생맛집(5점)으로 올리면{" "}
                <strong className="text-foreground">이번 달 횟수가 1회 돌아와요</strong>.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            다시 선택
          </Button>
          <Button onClick={onConfirm}>{meta.label}으로 평가</Button>
        </div>
      </div>
    </div>
  );
}
