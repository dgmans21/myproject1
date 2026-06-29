"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { api, Profile } from "@/lib/api";
import { getEmojiCatalogLabel, searchEmojiCatalog } from "@/lib/profile-emoji-catalog";
import {
  HOBBY_EMOJI_SUGGESTIONS,
  normalizeInterestEmojis,
  parseInterestInput,
  toggleInterestEmoji,
} from "@/lib/profile-interests";
import { Heart, Search } from "lucide-react";

interface ProfileInterestsPanelProps {
  onUpdated?: (profile: Profile) => void;
}

/** 취미·관심 — 유니코드 이모지를 직접 저장 (12간지 코드와 별개) */
export function ProfileInterestsPanel({ onUpdated }: ProfileInterestsPanelProps) {
  const [emojis, setEmojis] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const searchResults = useMemo(
    () => searchEmojiCatalog(searchQuery),
    [searchQuery]
  );

  useEffect(() => {
    api.profiles.me().then((p) => {
      setEmojis(normalizeInterestEmojis(p.profile_decor?.interest_emojis ?? []));
    }).catch(() => {});
  }, []);

  const persist = async (next: string[]) => {
    const normalized = normalizeInterestEmojis(next);
    const prev = emojis;
    setEmojis(normalized);
    setSaving(true);
    try {
      const updated = await api.profiles.update({
        profile_decor: { interest_emojis: normalized },
      });
      setEmojis(normalizeInterestEmojis(updated.profile_decor?.interest_emojis ?? []));
      onUpdated?.(updated);
    } catch (err) {
      setEmojis(prev);
      alert(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const addFromDraft = () => {
    if (!draft.trim()) return;
    const added = parseInterestInput(draft);
    if (added.length === 0) return;
    persist(normalizeInterestEmojis([...emojis, ...added]));
    setDraft("");
  };

  return (
    <Card className="mt-6">
      <CardTitle className="flex items-center gap-2 text-base">
        <Heart className="h-4 w-4 text-warm" /> 취미 · 관심
      </CardTitle>
      <CardDescription className="mt-1">
        이모지를 골라 닉네임 옆에 표시할 수 있어요. 검색하거나 기기 이모지 키보드로 직접 입력해도 됩니다.
      </CardDescription>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이모지 검색 (예: 야구, 고양이, 요리)"
          className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {searchQuery.trim() && (
        <div className="mt-3">
          {searchResults.length > 0 ? (
            <>
              <p className="text-xs text-muted">검색 결과 — 탭하여 추가</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {searchResults.map(({ emoji, keywords }) => {
                  const selected = emojis.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => persist(toggleInterestEmoji(emojis, emoji))}
                      className={`inline-flex flex-col items-center rounded-xl border px-2.5 py-2 transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40"
                      }`}
                      title={keywords.join(", ")}
                    >
                      <span className="text-lg leading-none">{emoji}</span>
                      <span className="mt-1 max-w-[4rem] truncate text-[10px] text-muted">
                        {keywords[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">「{searchQuery.trim()}」에 맞는 이모지가 없어요. 직접 입력해 보세요.</p>
          )}
        </div>
      )}

      {!searchQuery.trim() && (
        <p className="mt-3 text-xs text-muted">빠른 선택</p>
      )}

      {emojis.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => persist(emojis.filter((e) => e !== emoji))}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-lg leading-none hover:border-warm/50"
              title="탭하여 제거"
            >
              {emoji}
              <span className="text-[10px] text-muted">×</span>
            </button>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-7 gap-2 sm:grid-cols-10 ${searchQuery.trim() ? "mt-2" : "mt-4"}`}>
        {HOBBY_EMOJI_SUGGESTIONS.map((emoji) => {
          const selected = emojis.includes(emoji);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => persist(toggleInterestEmoji(emojis, emoji))}
              className={`flex h-10 w-full items-center justify-center rounded-xl border text-lg leading-none transition-colors ${
                selected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
              title={getEmojiCatalogLabel(emoji)}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="이모지 입력 (여러 개 가능)"
          className="min-w-[12rem] flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromDraft();
            }
          }}
        />
        <Button size="sm" variant="secondary" onClick={addFromDraft} disabled={!draft.trim()}>
          추가
        </Button>
      </div>

      {saving && <p className="mt-3 text-xs text-muted">저장 중…</p>}
    </Card>
  );
}
