"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { MeetingMemoryModal } from "@/components/MeetingMemoryModal";
import { api, ROOM_TYPE_LABELS, type MeetingMemoryListItem } from "@/lib/api";
import { BookMarked, CalendarDays, MapPin, PenLine } from "lucide-react";

function formatCardDate(date: string, time?: string) {
  try {
    const d = new Date(`${date}T${(time ?? "12:00:00").slice(0, 8)}`);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

export default function MeetingMemoriesPage() {
  const [items, setItems] = useState<MeetingMemoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MeetingMemoryListItem | null>(null);

  const load = () => {
    setLoading(true);
    api.appointments
      .listMeetingMemories()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <p className="mb-8 text-sm leading-relaxed text-muted">
        확정된 만남을 모아둔 곳이에요. 꼭 쓸 필요는 없고, 나중에 보고 싶을 때만 가볍게
        남겨두세요.
      </p>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <BookMarked className="mx-auto h-10 w-10 text-muted/40" />
          <p className="mt-4 text-sm text-muted">아직 확정된 만남이 없어요.</p>
          <p className="mt-1 text-xs text-muted/80">약속이 확정되면 여기에 쌓여요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.appointment_id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="w-full text-left"
              >
                <Card hover className="transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted">
                        {ROOM_TYPE_LABELS[item.room_type]} · {item.room_name}
                      </p>
                      <CardTitle className="mt-1 truncate text-base">{item.title}</CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatCardDate(item.confirmed_date, item.confirmed_time)}
                        </span>
                        {item.place_name && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {item.place_name}
                          </span>
                        )}
                      </div>
                      {item.my_memo_preview ? (
                        <CardDescription className="mt-3 line-clamp-2 text-foreground/75">
                          {item.my_memo_preview}
                        </CardDescription>
                      ) : (
                        <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted/90">
                          <PenLine className="h-3.5 w-3.5" />
                          비어 있어요 · 눌러서 적어볼 수 있어요
                        </p>
                      )}
                    </div>
                    {item.memo_count > 0 && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {item.memo_count}개
                      </span>
                    )}
                  </div>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <MeetingMemoryModal
        open={Boolean(selected)}
        item={selected}
        onClose={() => setSelected(null)}
        onSaved={load}
      />
    </div>
  );
}
