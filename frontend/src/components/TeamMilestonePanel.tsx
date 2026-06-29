"use client";

import { useEffect, useState } from "react";
import { api, TeamMilestoneItem } from "@/lib/api";
import { ListChecks } from "lucide-react";

interface TeamMilestonePanelProps {
  roomId: string;
  readOnly?: boolean;
}

/** 팀 일정방 — 이번 주 마일스톤 체크 (회의·디자인·QA·배포) */
export function TeamMilestonePanel({ roomId, readOnly = false }: TeamMilestonePanelProps) {
  const [items, setItems] = useState<TeamMilestoneItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.teamSchedule
      .getMilestones(roomId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  const toggle = async (itemId: string) => {
    if (readOnly) return;
    try {
      const next = await api.teamSchedule.toggleMilestone(roomId, itemId);
      setItems(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ListChecks className="h-4 w-4 text-primary" /> 이번 주 마일스톤
      </p>
      <p className="mt-1 text-xs text-muted">
        팀 업무 진행 상황을 함께 체크해 두세요. 월·주 일정과 별도로 관리됩니다.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">불러오는 중…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={readOnly}
                  onChange={() => toggle(item.id)}
                  className="rounded border-border"
                />
                <span className={item.done ? "text-muted line-through" : "text-foreground"}>
                  {item.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
