"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: ReactNode;
  summary?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

/** 방 상세 등 — 기본 접힘, 헤더 클릭으로 펼침 */
export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  className,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm", className)}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-foreground">{title}</div>
          {!open && summary ? (
            <div className="mt-1 text-sm text-muted">{summary}</div>
          ) : null}
        </div>
        {open ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        )}
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
