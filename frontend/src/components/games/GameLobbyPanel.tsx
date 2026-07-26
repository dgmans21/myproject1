"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { gamesApi, type CategoryItem, type PlayMode } from "@/lib/api/games";
import { type RoomMember } from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";
import { Gamepad2 } from "lucide-react";

export function GameLobbyPanel({
  roomId,
  members,
  isOwner,
  readOnly,
}: {
  roomId: string;
  members: RoomMember[];
  isOwner: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>("moderator");
  const [categoryId, setCategoryId] = useState("food");
  const [totalRounds, setTotalRounds] = useState(3);
  const [discussionSeconds, setDiscussionSeconds] = useState(90);
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState<string[]>(["플레이어1", "플레이어2", "플레이어3", "플레이어4"]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (readOnly || isGuestSession()) return;
    gamesApi
      .categories(roomId)
      .then((res) => {
        setCategories(res.categories);
        if (res.categories.length && !res.categories.some((c) => c.id === categoryId)) {
          setCategoryId(res.categories[0].id);
        }
      })
      .catch(() => {});
    gamesApi
      .active(roomId)
      .then((res) => {
        if (res.game && !res.game.ended) setActiveId(res.game.game_id);
      })
      .catch(() => {});
  }, [roomId, readOnly, categoryId]);

  useEffect(() => {
    setNames((prev) => {
      const next = Array.from({ length: playerCount }, (_, i) => prev[i] || `플레이어${i + 1}`);
      return next;
    });
  }, [playerCount]);

  const me = useMemo(() => members.find((m) => m.is_me), [members]);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const start = async () => {
    if (!isOwner) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        playMode === "moderator"
          ? {
              play_mode: playMode,
              total_rounds: totalRounds,
              category_id: categoryId,
              discussion_seconds: discussionSeconds,
              player_names: names.map((n, i) => n.trim() || `플레이어${i + 1}`),
              host_joins: true,
            }
          : {
              play_mode: playMode,
              total_rounds: totalRounds,
              category_id: categoryId,
              discussion_seconds: discussionSeconds,
              player_user_ids: Array.from(
                new Set([...(me?.user_id ? [me.user_id] : []), ...selectedMembers])
              ),
            };
      const res = await gamesApi.start(roomId, body);
      setActiveId(res.game.game_id);
      router.push(`/groups/${roomId}/games/${res.game.game_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "시작 실패");
    } finally {
      setBusy(false);
    }
  };

  if (readOnly) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Gamepad2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle>미니게임 · 라이어</CardTitle>
          <CardDescription className="mt-1">
            마피아와 같은 게임 엔진 프로토타입. 사회자(한 기기) 또는 원격(각자 기기)으로 진행합니다.
          </CardDescription>
        </div>
      </div>

      {activeId && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-sm text-foreground">진행 중인 게임이 있습니다.</p>
          <Button size="sm" onClick={() => router.push(`/groups/${roomId}/games/${activeId}`)}>
            이어하기
          </Button>
        </div>
      )}

      {isOwner ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={playMode === "moderator" ? "primary" : "secondary"}
              onClick={() => setPlayMode("moderator")}
            >
              사회자 모드
            </Button>
            <Button
              size="sm"
              variant={playMode === "remote" ? "primary" : "secondary"}
              onClick={() => setPlayMode("remote")}
            >
              원격 모드
            </Button>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">카테고리</span>
            <select
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.word_count})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">라운드 수</span>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full rounded-xl border border-border bg-card px-3 py-2"
                value={totalRounds}
                onChange={(e) => setTotalRounds(Number(e.target.value) || 1)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">토론(초)</span>
              <input
                type="number"
                min={10}
                max={600}
                className="w-full rounded-xl border border-border bg-card px-3 py-2"
                value={discussionSeconds}
                onChange={(e) => setDiscussionSeconds(Number(e.target.value) || 90)}
              />
            </label>
          </div>

          {playMode === "moderator" ? (
            <div className="space-y-2">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">인원 (3~12)</span>
                <input
                  type="number"
                  min={3}
                  max={12}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                  value={playerCount}
                  onChange={(e) =>
                    setPlayerCount(Math.min(12, Math.max(3, Number(e.target.value) || 3)))
                  }
                />
              </label>
              <div className="space-y-2">
                {names.map((n, i) => (
                  <Input
                    key={i}
                    label={i === 0 ? "이름 (1번=사회자 겸 참가)" : undefined}
                    value={n}
                    onChange={(e) => {
                      const next = [...names];
                      next[i] = e.target.value;
                      setNames(next);
                    }}
                    placeholder={`플레이어${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">참가할 멤버를 고르세요 (방장 포함, 최소 3명).</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const selected = m.is_me || selectedMembers.includes(m.user_id);
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      disabled={m.is_me}
                      onClick={() => toggleMember(m.user_id)}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground"
                      }`}
                    >
                      {m.display_name}
                      {m.is_me ? " (나)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={start} disabled={busy || !!activeId}>
            {busy ? "시작 중…" : "라이어 게임 시작"}
          </Button>
          {activeId && (
            <p className="text-xs text-muted">진행 중이면 이어하기를 사용하거나 게임 화면에서 종료하세요.</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">방장만 게임을 시작할 수 있습니다. 시작되면 이어하기가 표시됩니다.</p>
      )}
    </Card>
  );
}
