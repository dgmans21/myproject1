"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { api, FriendSummary, ProfileSearchHit } from "@/lib/api";

interface FriendAddModalProps {
  open: boolean;
  existingFriendIds: string[];
  onClose: () => void;
  onAdded: (friend: FriendSummary) => void;
}

export function FriendAddModal({
  open,
  existingFriendIds,
  onClose,
  onAdded,
}: FriendAddModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setError("");
      setAddingId(null);
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

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(() => {
      api.profiles
        .search(term)
        .then((rows) =>
          setResults(rows.filter((r) => !existingFriendIds.includes(r.user_id)))
        )
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, open, existingFriendIds]);

  const handleAdd = useCallback(
    async (hit: ProfileSearchHit) => {
      setError("");
      setAddingId(hit.user_id);
      try {
        const friend = await api.friends.add(hit.user_id);
        onAdded(friend);
        setResults((prev) => prev.filter((r) => r.user_id !== hit.user_id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "친구 추가에 실패했습니다");
      } finally {
        setAddingId(null);
      }
    },
    [onAdded]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-xl"
        role="dialog"
        aria-labelledby="friend-add-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="friend-add-title" className="text-base font-semibold text-foreground">
            친구 추가
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
              placeholder="닉네임으로 검색"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          {error && <p className="mt-3 text-sm text-warm">{error}</p>}

          <div className="mt-3 max-h-56 overflow-y-auto">
            {query.trim().length < 1 ? (
              <p className="py-6 text-center text-sm text-muted">
                추가할 사람의 닉네임을 입력하세요
              </p>
            ) : searching ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                검색 중...
              </p>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">검색 결과가 없습니다</p>
            ) : (
              <ul className="space-y-1">
                {results.map((hit) => (
                  <li
                    key={hit.user_id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-transparent bg-surface px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {hit.display_name}
                      </p>
                      {hit.residence && (
                        <p className="truncate text-xs text-muted">{hit.residence}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={addingId === hit.user_id}
                      onClick={() => void handleAdd(hit)}
                    >
                      {addingId === hit.user_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" /> 추가
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-2 text-xs text-muted">정확한 닉네임 일부만 입력해도 검색됩니다</p>
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
