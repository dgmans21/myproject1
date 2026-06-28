"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MemberPickerItem {
  user_id: string;
  display_name: string;
}

interface MemberPickerModalBaseProps {
  open: boolean;
  title: string;
  items: MemberPickerItem[];
  confirmLabel: string;
  emptyMessage?: string;
  footerHint?: string;
  submitting?: boolean;
  onClose: () => void;
}

type MemberPickerModalProps = MemberPickerModalBaseProps &
  (
    | { multiple?: false; onConfirm: (userId: string) => void }
    | { multiple: true; onConfirm: (userIds: string[]) => void }
  );

/** 멤버·친구 선택 공통 모달 (검색 + 스크롤 목록, 단일/다중) */
export function MemberPickerModal(props: MemberPickerModalProps) {
  const {
    open,
    title,
    items,
    confirmLabel,
    emptyMessage = "선택할 수 있는 사람이 없습니다.",
    footerHint,
    submitting = false,
    onClose,
    multiple = false,
    onConfirm,
  } = props;

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedId("");
      setSelectedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.display_name.toLowerCase().includes(q));
  }, [items, query]);

  const toggleMulti = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((item) => next.add(item.user_id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    if (multiple) {
      const ids = [...selectedIds];
      if (ids.length === 0) return;
      (onConfirm as (userIds: string[]) => void)(ids);
    } else if (selectedId) {
      (onConfirm as (userId: string) => void)(selectedId);
    }
  };

  if (!open) return null;

  const selectedCount = selectedIds.size;
  const hint =
    footerHint ??
    (multiple
      ? `${items.length}명 · 여러 명 선택 가능`
      : `${items.length}명 · 목록에서 선택 후 확인`);

  const actionLabel = multiple
    ? selectedCount > 0
      ? `${selectedCount}명 ${confirmLabel}`
      : confirmLabel
    : confirmLabel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-xl"
        role="dialog"
        aria-labelledby="member-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="member-picker-title" className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 검색"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          {multiple && filtered.length > 0 && (
            <div className="mt-2 flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-primary hover:underline"
              >
                {query.trim() ? "검색 결과 전체 선택" : "전체 선택"}
              </button>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-muted hover:text-foreground hover:underline"
                >
                  선택 해제
                </button>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted">{emptyMessage}</p>
          ) : filtered.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted">검색 결과가 없습니다.</p>
          ) : (
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
              {filtered.map((item) => {
                const selected = multiple
                  ? selectedIds.has(item.user_id)
                  : selectedId === item.user_id;
                return (
                  <li key={item.user_id}>
                    <button
                      type="button"
                      onClick={() =>
                        multiple ? toggleMulti(item.user_id) : setSelectedId(item.user_id)
                      }
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-transparent bg-surface text-foreground hover:border-border"
                      )}
                    >
                      {multiple && (
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background"
                          )}
                          aria-hidden
                        >
                          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      )}
                      {item.display_name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-2 text-xs text-muted">
            {multiple && selectedCount > 0
              ? `${selectedCount}명 선택 · ${hint}`
              : hint}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button
            size="sm"
            disabled={(multiple ? selectedCount === 0 : !selectedId) || submitting}
            onClick={handleConfirm}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
