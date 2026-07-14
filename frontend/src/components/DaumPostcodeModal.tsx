"use client";

import { useEffect, useRef, useState } from "react";
import { embedDaumPostcode } from "@/lib/daum-postcode";
import { Loader2, X } from "lucide-react";

export function DaumPostcodeModal({
  open,
  onClose,
  onSelect,
  title = "주소 검색",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
  title?: string;
}) {
  const embedRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const onSelectRef = useRef(onSelect);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  onCloseRef.current = onClose;
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!open) {
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setLoading(true);

    const frame = requestAnimationFrame(() => {
      const container = embedRef.current;
      if (!container || cancelled) return;

      void embedDaumPostcode({
        container,
        onComplete: (address) => {
          onSelectRef.current(address);
          onCloseRef.current();
        },
        onClose: (state) => {
          if (state === "FORCE_CLOSE") {
            onCloseRef.current();
          }
        },
      })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "주소 검색을 불러오지 못했습니다");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (embedRef.current) {
        embedRef.current.innerHTML = "";
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daum-postcode-title"
      onClick={() => onCloseRef.current()}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:max-h-[85dvh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 id="daum-postcode-title" className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {error ? (
            <p className="p-4 text-sm text-accent">{error}</p>
          ) : (
            <div
              ref={embedRef}
              className="h-[min(72dvh,520px)] w-full sm:h-[min(520px,70dvh)]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
