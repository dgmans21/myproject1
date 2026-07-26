"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { gamesApi, PLAY_MODE_LABELS, LIAR_MODE_LABELS, TOPIC_POLICY_LABELS, type CategoryItem, type LiarMode, type PlayMode, type TopicPolicy } from "@/lib/api/games";
import { type RoomMember } from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";
import { Gamepad2 } from "lucide-react";
import { MafiaRoleGlyph } from "@/components/games/MafiaRoleGlyph";
import { mafiaRoleTone } from "@/lib/games/mafia-roles";

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
  const [gameKind, setGameKind] = useState<"liar" | "mafia">("liar");
  const [liarMode, setLiarMode] = useState<LiarMode>("category_only");
  const [topicPolicy, setTopicPolicy] = useState<TopicPolicy>("random_each_round");
  const [categoryId, setCategoryId] = useState("food");
  const [totalRounds, setTotalRounds] = useState(3);
  const [discussionSeconds, setDiscussionSeconds] = useState(90);
  const [playerCount, setPlayerCount] = useState(5);
  const [botCount, setBotCount] = useState(0);
  const [mafiaCount, setMafiaCount] = useState(1);
  const [spyCount, setSpyCount] = useState(0);
  const [doctorCount, setDoctorCount] = useState(1);
  const [policeCount, setPoliceCount] = useState(1);
  const [vigilanteCount, setVigilanteCount] = useState(0);
  const [roleRevealOnDeath, setRoleRevealOnDeath] = useState(true);
  const [names, setNames] = useState<string[]>([
    "플레이어1",
    "플레이어2",
    "플레이어3",
    "플레이어4",
    "플레이어5",
  ]);
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

  useEffect(() => {
    const min = gameKind === "mafia" ? 5 : 3;
    setPlayerCount((c) => Math.max(min, c));
    if (gameKind === "mafia") {
      setTotalRounds((r) => Math.min(r, 10));
    }
  }, [gameKind]);

  const clampPlayerCount = (n: number) => {
    const min = gameKind === "mafia" ? 5 : 3;
    const max = gameKind === "mafia" ? 16 : 12;
    return Math.min(max, Math.max(min, n || min));
  };

  const start = async () => {
    if (!isOwner) return;
    setBusy(true);
    setError(null);
    try {
      const safeCount = clampPlayerCount(playerCount);
      if (safeCount !== playerCount) setPlayerCount(safeCount);
      const startNames =
        playMode === "moderator"
          ? Array.from(
              { length: safeCount },
              (_, i) => names[i]?.trim() || `플레이어${i + 1}`
            )
          : names;

      const commonPlayers =
        playMode === "moderator"
          ? {
              player_names: startNames,
            }
          : {
              player_user_ids: Array.from(
                new Set([...(me?.user_id ? [me.user_id] : []), ...selectedMembers])
              ),
            };

      const body =
        gameKind === "mafia"
          ? {
              game_type: "mafia" as const,
              play_mode: playMode,
              total_rounds: totalRounds,
              discussion_seconds: discussionSeconds,
              host_joins: playMode === "remote",
              bot_count: botCount,
              mafia_count: mafiaCount,
              spy_count: spyCount,
              doctor_count: doctorCount,
              police_count: policeCount,
              vigilante_count: vigilanteCount,
              role_reveal_on_death: roleRevealOnDeath,
              ...commonPlayers,
            }
          : {
              game_type: "liar" as const,
              play_mode: playMode,
              liar_mode: liarMode,
              topic_policy: topicPolicy,
              total_rounds: totalRounds,
              category_id: categoryId,
              discussion_seconds: discussionSeconds,
              host_joins: true,
              ...commonPlayers,
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
          <CardTitle>미니게임</CardTitle>
          <CardDescription className="mt-1">
            라이어 · 마피아. 사회자 테이블 또는 온라인 파티로 진행합니다.
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
          <div>
            <p className="mb-2 text-xs font-medium text-muted">게임</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={gameKind === "liar" ? "primary" : "secondary"}
                onClick={() => setGameKind("liar")}
              >
                라이어
              </Button>
              <Button
                size="sm"
                variant={gameKind === "mafia" ? "primary" : "secondary"}
                onClick={() => setGameKind("mafia")}
              >
                마피아
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted">진행 방식</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={playMode === "moderator" ? "primary" : "secondary"}
                onClick={() => setPlayMode("moderator")}
              >
                {PLAY_MODE_LABELS.moderator}
              </Button>
              <Button
                size="sm"
                variant={playMode === "remote" ? "primary" : "secondary"}
                onClick={() => setPlayMode("remote")}
              >
                {PLAY_MODE_LABELS.remote}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {playMode === "moderator"
                ? gameKind === "mafia"
                  ? "한 대 폰으로 진행 · 사회자는 딜러(기본 비참가)"
                  : "한 대 폰을 돌려가며 진행 · 사회자도 참가 가능"
                : "각자 휴대폰으로 접속 · 실시간 진행"}
            </p>
          </div>

          {gameKind === "liar" && (
            <>
              <div>
                <p className="mb-2 text-xs font-medium text-muted">라이어 규칙</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={liarMode === "category_only" ? "primary" : "secondary"}
                    onClick={() => setLiarMode("category_only")}
                  >
                    {LIAR_MODE_LABELS.category_only}
                  </Button>
                  <Button
                    size="sm"
                    variant={liarMode === "fake_word" ? "primary" : "secondary"}
                    onClick={() => setLiarMode("fake_word")}
                  >
                    {LIAR_MODE_LABELS.fake_word}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {liarMode === "category_only"
                    ? "라이어는 주제만 보고 단어는 모름"
                    : "주제는 같고, 라이어만 정답이 아닌 다른 단어를 받음 (카드상 시민처럼 보임)"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted">주제</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={topicPolicy === "random_each_round" ? "primary" : "secondary"}
                    onClick={() => setTopicPolicy("random_each_round")}
                  >
                    {TOPIC_POLICY_LABELS.random_each_round}
                  </Button>
                  <Button
                    size="sm"
                    variant={topicPolicy === "fixed" ? "primary" : "secondary"}
                    onClick={() => setTopicPolicy("fixed")}
                  >
                    {TOPIC_POLICY_LABELS.fixed}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {topicPolicy === "random_each_round"
                    ? "라운드마다 주제가 바뀌어 지루함을 덜어줍니다"
                    : "선택한 카테고리만 계속 사용합니다"}
                </p>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-muted">
                  {topicPolicy === "fixed" ? "카테고리" : "시작 카테고리 (선택·첫 판 힌트)"}
                </span>
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
            </>
          )}

          {gameKind === "mafia" && (
            <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-3">
              <p className="text-xs font-medium text-muted">직업 수</p>
              <ul className="space-y-2">
                {(
                  [
                    {
                      role: "mafia" as const,
                      label: "마피아",
                      hint: "밤에 한 명을 제거합니다",
                      val: mafiaCount,
                      setVal: setMafiaCount,
                      max: 5,
                    },
                    {
                      role: "spy" as const,
                      label: "스파이",
                      hint: "마피아 편 · 1회, 특수직업 여부만 조사 · 마피아가 누구인지는 확인할 수 없습니다",
                      val: spyCount,
                      setVal: setSpyCount,
                      max: 5,
                    },
                    {
                      role: "doctor" as const,
                      label: "의사",
                      hint: "밤에 한 명을 치료합니다",
                      val: doctorCount,
                      setVal: setDoctorCount,
                      max: 5,
                    },
                    {
                      role: "police" as const,
                      label: "경찰",
                      hint: "밤에 마피아 진영인지 조사합니다",
                      val: policeCount,
                      setVal: setPoliceCount,
                      max: 5,
                    },
                    {
                      role: "vigilante" as const,
                      label: "자경단",
                      hint: "밤에 처형(적·아군 불문) · 첫날밤 불가·3밤마다 1회 · 시민이면 자폭 · 의사·경찰 처치 시 정체 공개",
                      val: vigilanteCount,
                      setVal: setVigilanteCount,
                      max: 5,
                    },
                    {
                      role: "bot" as const,
                      label: "봇",
                      hint: "인원이 모자랄 때 자리를 채웁니다",
                      val: botCount,
                      setVal: setBotCount,
                      max: 8,
                    },
                  ] as const
                ).map((row) => {
                  const tone =
                    row.role === "bot" ? mafiaRoleTone(null) : mafiaRoleTone(row.role);
                  return (
                    <li
                      key={row.label}
                      className={`flex items-start gap-3 rounded-lg border px-2.5 py-2 ${tone.soft} ${tone.border}`}
                    >
                      <MafiaRoleGlyph role={row.role} className="mt-0.5 h-5 w-5" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${tone.text}`}>{row.label}</p>
                        <p className="mt-0.5 break-keep text-[11px] leading-snug text-muted">
                          {row.hint}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={row.max}
                        aria-label={`${row.label} 수`}
                        className="w-14 shrink-0 rounded-lg border border-border bg-card px-2 py-1.5 text-center text-sm tabular-nums"
                        value={row.val}
                        onChange={(e) => row.setVal(Number(e.target.value) || 0)}
                      />
                    </li>
                  );
                })}
              </ul>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={roleRevealOnDeath}
                  onChange={(e) => setRoleRevealOnDeath(e.target.checked)}
                />
                사망 시 직업명 공개
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">라운드 수</span>
              <input
                type="number"
                min={1}
                max={gameKind === "mafia" ? 10 : 20}
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
                <span className="mb-1 block text-muted">
                  인원 ({gameKind === "mafia" ? "5~16" : "3~12"}
                  {gameKind === "mafia" ? ", 봇 별도" : ""})
                </span>
                <input
                  type="number"
                  min={gameKind === "mafia" ? 5 : 3}
                  max={gameKind === "mafia" ? 16 : 12}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                  value={playerCount || ""}
                  onChange={(e) => {
                    // 입력 중 min 클램프 금지: "10" 입력 시 1→5 강제 후 0 붙여 50→16 되는 버그 방지
                    const max = gameKind === "mafia" ? 16 : 12;
                    const raw = e.target.value;
                    if (raw === "") {
                      setPlayerCount(0);
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;
                    setPlayerCount(Math.min(max, Math.max(0, Math.floor(n))));
                  }}
                  onBlur={() => setPlayerCount((c) => clampPlayerCount(c))}
                />
              </label>
              <div className="space-y-2">
                {names.map((n, i) => (
                  <Input
                    key={i}
                    label={
                      i === 0
                        ? gameKind === "mafia"
                          ? "이름 (사회자는 기본 비참가)"
                          : "이름 (1번=사회자 겸 참가)"
                        : undefined
                    }
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
            {busy ? "시작 중…" : gameKind === "mafia" ? "마피아 시작" : "라이어 시작"}
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
