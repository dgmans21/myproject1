"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useGameSocket } from "@/hooks/use-game-socket";
import { gamesApi, type GameView, type RoleCard } from "@/lib/api/games";

const PHASE_LABEL: Record<string, string> = {
  ROLE_REVEAL: "역할 공개",
  DISCUSSION: "토론",
  VOTE: "투표",
  REVEAL: "결과 공개",
  GUESS: "정답 맞히기",
  ROUND_SCORE: "라운드 점수",
  ENDED: "종료",
};

function RoleCardView({ card, title }: { card: RoleCard; title?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5 text-center">
      {title && <p className="mb-2 text-xs text-muted">{title}</p>}
      {card.display_name && (
        <p className="text-sm font-medium text-muted">{card.display_name}</p>
      )}
      <p className="mt-1 text-sm text-muted">주제 · {card.category_name}</p>
      {card.is_liar ? (
        <>
          <p className="mt-3 text-2xl font-bold text-accent">당신은 라이어</p>
          <p className="mt-2 text-sm text-muted">단어는 모릅니다. 주제에 맞춰 자연스럽게 섞이세요.</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-2xl font-bold text-primary">{card.word}</p>
          <p className="mt-2 text-sm text-muted">시민 — 이 단어를 설명하세요.</p>
        </>
      )}
    </div>
  );
}

function ScoreBoard({ game }: { game: GameView }) {
  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  return (
    <ul className="space-y-1">
      {sorted.map((p) => (
        <li
          key={p.player_id}
          className="flex items-center justify-between rounded-lg px-2 py-1 text-sm"
        >
          <span className="text-foreground">
            {p.display_name}
            {game.winner_player_id === p.player_id ? " 🏆" : ""}
          </span>
          <span className="font-medium tabular-nums text-foreground">{p.score}점</span>
        </li>
      ))}
    </ul>
  );
}

function PhaseTimer({ game }: { game: GameView }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!game.phase_duration_seconds || !game.phase_started_at) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const start = new Date(game.phase_started_at).getTime();
      const end = start + game.phase_duration_seconds! * 1000;
      setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game.phase_duration_seconds, game.phase_started_at, game.phase]);

  if (remaining == null) return null;
  return <p className="text-sm tabular-nums text-muted">남은 시간 {remaining}초</p>;
}

export default function GamePage() {
  const router = useRouter();
  const params = useParams<{ id: string; gameId: string }>();
  const roomId = params.id;
  const gameId = params.gameId;
  const { game, status, error, sendAction } = useGameSocket(roomId, gameId);
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (action: string, data?: Record<string, unknown>) => {
    setBusy(true);
    try {
      await sendAction(action, data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "실패");
    } finally {
      setBusy(false);
    }
  };

  const forceEnd = async () => {
    if (!confirm("게임을 강제 종료할까요?")) return;
    setBusy(true);
    try {
      await gamesApi.forceEnd(roomId, gameId);
      router.push(`/groups/${roomId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "종료 실패");
    } finally {
      setBusy(false);
    }
  };

  if (!game) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href={`/groups/${roomId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted">
          <ArrowLeft className="h-4 w-4" /> 방으로
        </Link>
        <Card>
          <CardTitle>게임 연결 중…</CardTitle>
          <CardDescription className="mt-2">
            상태: {status}
            {error ? ` · ${error}` : ""}
          </CardDescription>
        </Card>
      </div>
    );
  }

  const isMod = game.play_mode === "moderator";
  const host = game.is_host;
  const players = game.players;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/groups/${roomId}`} className="inline-flex items-center gap-1 text-sm text-muted">
          <ArrowLeft className="h-4 w-4" /> 방
        </Link>
        {host && (
          <Button size="sm" variant="ghost" onClick={forceEnd} disabled={busy}>
            강제 종료
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted">
              라이어 · {game.category_name} · {isMod ? "사회자" : "원격"}
            </p>
            <CardTitle className="mt-1">
              라운드 {game.current_round}/{game.total_rounds}
            </CardTitle>
            <p className="mt-1 text-sm font-medium text-primary">
              {PHASE_LABEL[game.phase] || game.phase}
            </p>
          </div>
          <PhaseTimer game={game} />
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {/* ROLE_REVEAL */}
        {game.phase === "ROLE_REVEAL" && (
          <div className="mt-5 space-y-4">
            {isMod && host && game.pass_device && (
              <>
                <RoleCardView
                  card={game.pass_device}
                  title={`${(game.pass_device.index ?? 0) + 1}/${game.pass_device.total} · 폰을 넘기세요`}
                />
                <Button className="w-full" onClick={() => act("advance_reveal")} disabled={busy}>
                  확인함 · 다음 사람
                </Button>
              </>
            )}
            {isMod && host && !game.pass_device && (
              <>
                <p className="text-sm text-muted">전원 역할 공개가 끝났습니다. 토론을 시작하세요.</p>
                <Button className="w-full" onClick={() => act("finish_reveal")} disabled={busy}>
                  토론 시작
                </Button>
              </>
            )}
            {!isMod && game.role_card && (
              <RoleCardView card={game.role_card} title="나만 보는 카드" />
            )}
            {!isMod && host && (
              <Button className="w-full" onClick={() => act("finish_reveal")} disabled={busy}>
                전원 확인됨 · 토론 시작
              </Button>
            )}
            {!isMod && !host && (
              <p className="text-sm text-muted">방장이 토론을 시작할 때까지 기다리세요.</p>
            )}
          </div>
        )}

        {/* DISCUSSION */}
        {game.phase === "DISCUSSION" && (
          <div className="mt-5 space-y-4">
            {!isMod && game.role_card && <RoleCardView card={game.role_card} />}
            {isMod && (
              <p className="text-sm text-muted">
                오프라인으로 자유롭게 토론하세요. 시간이 끝나거나 방장이 투표로 넘길 수 있습니다.
              </p>
            )}
            {!isMod && (
              <p className="text-sm text-muted">채팅은 프로토타입에서 생략 — 음성/별도 채널로 토론하세요.</p>
            )}
            {host && (
              <Button className="w-full" onClick={() => act("end_discussion")} disabled={busy}>
                토론 종료 · 투표
              </Button>
            )}
          </div>
        )}

        {/* VOTE */}
        {game.phase === "VOTE" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-muted">
              {isMod
                ? "오프라인 투표 결과를 반영해 한 명을 지목하세요. 동률이면 검거 실패."
                : "라이어로 의심되는 한 명에게 투표하세요. 동률이면 검거 실패."}
            </p>
            <div className="grid gap-2">
              {players.map((p) => {
                const disabled =
                  busy ||
                  (!isMod && (p.player_id === game.my_player_id || !!game.round.my_vote));
                return (
                  <Button
                    key={p.player_id}
                    variant="secondary"
                    className="w-full justify-between"
                    disabled={disabled}
                    onClick={() =>
                      act(isMod ? "moderator_accuse" : "cast_vote", {
                        target_player_id: p.player_id,
                      })
                    }
                  >
                    <span>{p.display_name}</span>
                    {!isMod && game.round.my_vote === p.player_id && <span>내 표</span>}
                  </Button>
                );
              })}
            </div>
            {isMod && host && (
              <Button
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => act("moderator_arrest_fail")}
              >
                동률 / 포기 → 검거 실패
              </Button>
            )}
            {!isMod && (
              <p className="text-xs text-muted">
                투표 {game.round.votes_cast}/{game.round.player_count}
                {game.round.my_vote ? " · 투표 완료" : ""}
              </p>
            )}
          </div>
        )}

        {/* REVEAL */}
        {game.phase === "REVEAL" && (
          <div className="mt-5 space-y-4 text-center">
            <p className="text-sm text-muted">정답 단어</p>
            <p className="text-3xl font-bold text-primary">{game.round.word}</p>
            <p className="text-sm text-foreground">
              라이어:{" "}
              {players.find((p) => p.player_id === game.round.liar_player_id)?.display_name}
            </p>
            {game.round.accused_player_id && (
              <p className="text-sm text-muted">
                지목:{" "}
                {players.find((p) => p.player_id === game.round.accused_player_id)?.display_name}
              </p>
            )}
            <p
              className={`text-lg font-semibold ${
                game.round.arrest_success ? "text-primary" : "text-accent"
              }`}
            >
              {game.round.arrest_success ? "검거 완료" : "검거 실패"}
            </p>
            {host && (
              <Button className="w-full" onClick={() => act("ack_round_score")} disabled={busy}>
                {game.round.arrest_success ? "정답 타임으로" : "점수 확인"}
              </Button>
            )}
          </div>
        )}

        {/* GUESS */}
        {game.phase === "GUESS" && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-muted">라이어가 단어를 맞히면 추가 점수.</p>
            {isMod && host && (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => act("moderator_guess", { correct: true })}
                  disabled={busy}
                >
                  맞춤 (+200)
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => act("moderator_guess", { correct: false })}
                  disabled={busy}
                >
                  못 맞춤
                </Button>
              </div>
            )}
            {!isMod && game.i_am_liar && (
              <div className="space-y-2">
                <Input
                  label="정답 추측"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="단어 입력"
                />
                <Button
                  className="w-full"
                  disabled={busy || !guess.trim()}
                  onClick={() => act("submit_guess", { guess })}
                >
                  제출
                </Button>
              </div>
            )}
            {!isMod && !game.i_am_liar && (
              <p className="text-sm text-muted">라이어가 정답을 입력하는 중입니다…</p>
            )}
          </div>
        )}

        {/* ROUND_SCORE */}
        {game.phase === "ROUND_SCORE" && (
          <div className="mt-5 space-y-4">
            {game.round.round_delta && (
              <ul className="space-y-1 text-sm">
                {players.map((p) => (
                  <li key={p.player_id} className="flex justify-between">
                    <span>{p.display_name}</span>
                    <span className="tabular-nums">
                      {(game.round.round_delta?.[p.player_id] ?? 0) >= 0 ? "+" : ""}
                      {game.round.round_delta?.[p.player_id] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ScoreBoard game={game} />
            {host && (
              <Button className="w-full" onClick={() => act("ack_round_score")} disabled={busy}>
                {game.current_round >= game.total_rounds ? "최종 결과" : "다음 라운드"}
              </Button>
            )}
          </div>
        )}

        {/* ENDED */}
        {game.phase === "ENDED" && (
          <div className="mt-5 space-y-4 text-center">
            <p className="text-sm text-muted">
              {game.winner_tiebreak ? "동점 · 랜덤 우승" : "우승"}
            </p>
            <p className="text-2xl font-bold text-primary">
              {players.find((p) => p.player_id === game.winner_player_id)?.display_name}
            </p>
            <ScoreBoard game={game} />
            <Button className="w-full" onClick={() => router.push(`/groups/${roomId}`)}>
              방으로 돌아가기
            </Button>
          </div>
        )}
      </Card>

      {game.phase !== "ENDED" && (
        <Card className="mt-4">
          <CardTitle className="text-base">점수판</CardTitle>
          <div className="mt-2">
            <ScoreBoard game={game} />
          </div>
        </Card>
      )}
    </div>
  );
}
