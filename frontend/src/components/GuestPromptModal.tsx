"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { clearGuestSession } from "@/lib/auth-session";
import type { WriteAction } from "@/lib/permissions";
import { WRITE_ACTION_LABELS } from "@/lib/permissions";
import { LogIn, X } from "lucide-react";

interface GuestPromptModalProps {
  open: boolean;
  action: WriteAction;
  onClose: () => void;
}

/** 비회원 → 회원 전환 유도 (강제 가입 대신 자연스러운 안내) */
export function GuestPromptModal({ open, action, onClose }: GuestPromptModalProps) {
  const router = useRouter();

  if (!open) return null;

  const actionLabel = WRITE_ACTION_LABELS[action];

  const goLogin = () => {
    clearGuestSession();
    onClose();
    router.push("/?signup=1");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="guest-prompt-title"
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="guest-prompt-title" className="text-lg font-semibold text-foreground">
            로그인이 필요해요
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          <strong className="text-foreground">{actionLabel}</strong>은 회원만 이용할 수 있습니다.
          지금까지 둘러보신 내용은 그대로이며, 가입 후 이어서 작성할 수 있어요.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            나중에
          </Button>
          <Button size="sm" onClick={goLogin}>
            <LogIn className="h-3.5 w-3.5" /> 로그인 · 가입하기
          </Button>
        </div>
      </div>
    </div>
  );
}
