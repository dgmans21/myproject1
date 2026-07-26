"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import type { GameView } from "@/lib/api/games";
import { PLAY_MODE_LABELS } from "@/lib/api/games";
import { mafiaRoleFromNightKey, mafiaRoleTone } from "@/lib/games/mafia-roles";
import { MafiaRoleChip, MafiaRoleGlyph } from "@/components/games/MafiaRoleGlyph";

const PHASE_LABEL: Record<string, string> = {
  ROLE_REVEAL: "역할 공개",
  NIGHT: "밤",
  NIGHT_RESULT: "아침 결과",
  DAY_DISCUSSION: "낮 토론",
  VOTE: "투표",
  REVOTE: "재투표",
  EXECUTION: "처형",
  ROUND_SCORE: "라운드 점수",
  ENDED: "종료",
};

function nightKeyLabel(key: string): string {
  if (key === "mafia_kill") return "마피아 암살";
  if (key.startsWith("doctor:")) return "의사 치료";
  if (key.startsWith("police:")) return "경찰 조사";
  if (key.startsWith("spy:")) return "스파이 조사";
  if (key.startsWith("vigilante:")) return "자경단 처형";
  return key;
}

/** Actor player_id for role-scoped night keys; null for shared mafia_kill. */
function nightActorId(key: string): string | null {
  const i = key.indexOf(":");
  if (i < 0) return null;
  return key.slice(i + 1) || null;
}

function DiscussionTimer({ game }: { game: GameView }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const vibrated = useRef(false);
  const expired = !!game.discussion_expired;

  useEffect(() => {
    vibrated.current = false;
  }, [game.phase_started_at, game.current_round, game.night_index]);

  useEffect(() => {
    if (game.phase !== "DAY_DISCUSSION") {
      setRemaining(null);
      return;
    }
    if (expired) {
      setRemaining(0);
      return;
    }
    if (!game.phase_duration_seconds || !game.phase_started_at) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const start = new Date(game.phase_started_at).getTime();
      const end = start + game.phase_duration_seconds! * 1000;
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !vibrated.current) {
        vibrated.current = true;
        try {
          navigator.vibrate?.(220);
        } catch {
          /* ignore */
        }
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [
    game.phase,
    game.phase_duration_seconds,
    game.phase_started_at,
    expired,
  ]);

  useEffect(() => {
    if (expired && !vibrated.current) {
      vibrated.current = true;
      try {
        navigator.vibrate?.([120, 60, 120]);
      } catch {
        /* ignore */
      }
    }
  }, [expired]);

  if (game.phase !== "DAY_DISCUSSION") return null;

  const showExpired = expired || remaining === 0;
  const mm = remaining != null ? Math.floor(remaining / 60) : 0;
  const ss = remaining != null ? remaining % 60 : 0;
  const urgent = remaining != null && remaining > 0 && remaining <= 15;

  return (
    <div
      className={`rounded-2xl border px-4 py-4 text-center ${
        showExpired
          ? "border-accent/40 bg-accent/10"
          : urgent
            ? "border-red-500/30 bg-red-500/10"
            : "border-border bg-surface/60"
      }`}
    >
      <p className="text-xs font-medium text-muted">토론 시간</p>
      {showExpired ? (
        <p className="mt-1 text-2xl font-bold text-accent">시간 종료</p>
      ) : remaining != null ? (
        <p
          className={`mt-1 text-4xl font-bold tabular-nums tracking-tight ${
            urgent ? "text-red-600 dark:text-red-400" : "text-foreground"
          }`}
        >
          {mm}:{String(ss).padStart(2, "0")}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">타이머 없음</p>
      )}
      {showExpired && (
        <p className="mt-2 break-keep text-sm text-muted">
          사회자가 투표 시작을 눌러 주세요
        </p>
      )}
    </div>
  );
}

function RoleName({
  role,
  label,
  className = "",
}: {
  role?: string | null;
  label?: string | null;
  className?: string;
}) {
  const tone = mafiaRoleTone(role);
  return <span className={`${tone.text} ${className}`}>{label || role}</span>;
}

function RoleRevealCard({
  role,
  label,
  name,
  index,
  total,
  peers,
}: {
  role?: string | null;
  label?: string | null;
  name?: string | null;
  index?: number;
  total?: number;
  peers?: string;
}) {
  const tone = mafiaRoleTone(role);
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border p-6 text-center sm:p-8 ${tone.soft} ${tone.border}`}
    >
      {typeof index === "number" && typeof total === "number" && (
        <p className="text-xs text-muted">
          {index + 1}/{total} · 폰을 넘기세요
        </p>
      )}
      {name && <p className="mt-2 text-sm text-muted">{name}</p>}
      <div className="mt-3 flex flex-col items-center gap-2">
        <MafiaRoleGlyph role={role} className="h-16 w-16" />
        <p className={`text-2xl font-bold ${tone.text}`}>{label}</p>
      </div>
      {peers ? <p className="mt-2 text-sm text-muted">동료: {peers}</p> : null}
    </div>
  );
}

export function MafiaGameView({
  game,
  busy,
  onAction,
}: {
  game: GameView;
  busy: boolean;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}) {
  const isMod = game.play_mode === "moderator";
  const host = game.is_host;
  const alive = new Set(game.alive_player_ids || []);
  const players = game.players || [];
  const [nightKey, setNightKey] = useState<string>("");
  const [invIndex, setInvIndex] = useState(0);
  const [tab, setTab] = useState<"play" | "score">("play");
  const needed = game.night_needed || [];

  const currentNightKey =
    nightKey && needed.includes(nightKey) ? nightKey : needed[0] || "";
  const myTone = mafiaRoleTone(game.my_role);
  const modInvestigates = game.moderator_investigates || [];
  const roleMap =
    game.roles_public || game.moderator_roles || game.revealed_roles || null;

  /** 폰 넘김 비공개 화면 — 하단 직업·점수 탭을 숨겨 옆사람 노출 방지 */
  const passPhonePrivate =
    (isMod && host && game.phase === "ROLE_REVEAL" && !!game.pass_device) ||
    (isMod && host && game.phase === "NIGHT_RESULT" && modInvestigates.length > 0);

  useEffect(() => {
    setInvIndex(0);
  }, [game.night_index, game.phase, game.current_round]);

  useEffect(() => {
    if (passPhonePrivate) setTab("play");
  }, [passPhonePrivate]);

  const alivePlayers = useMemo(
    () => players.filter((p) => alive.has(p.player_id)),
    [players, alive]
  );

  const peerNames = (peers: GameView["mafia_peers"]) =>
    (peers || [])
      .map((m) =>
        typeof m === "string"
          ? players.find((p) => p.player_id === m)?.display_name || m
          : m.display_name
      )
      .join(", ");

  const showModRoles = isMod && host && !passPhonePrivate;

  return (
    <Card className="flex h-full min-h-0 flex-col !p-4 sm:!p-6">
      {!passPhonePrivate && (
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted">
              마피아 · {PLAY_MODE_LABELS[game.play_mode]} · 턴 {game.turn_index ?? 0}
            </p>
            <CardTitle className="mt-1">
              라운드 {game.current_round}/{game.total_rounds}
            </CardTitle>
            <p className="mt-1 text-sm font-medium text-primary">
              {PHASE_LABEL[game.phase] || game.phase}
            </p>
          </div>
          {game.my_role_label && (
            <p
              className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${myTone.soft} ${myTone.border} ${myTone.text}`}
            >
              <MafiaRoleGlyph role={game.my_role} className="h-3.5 w-3.5" />
              <span className="truncate">내 직업 · {game.my_role_label}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {tab === "score" && !passPhonePrivate ? (
          <div className="flex min-h-full flex-col">
            <p className="mb-3 text-sm font-medium text-foreground">
              생존 · 점수{showModRoles ? " · 역할" : ""}
            </p>
            <ul className="space-y-2 text-sm">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((p) => {
                  const pub = showModRoles
                    ? roleMap?.[p.player_id]
                    : game.roles_public?.[p.player_id] || game.revealed_roles?.[p.player_id];
                  return (
                    <li
                      key={p.player_id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface/40 px-3 py-2.5"
                    >
                      <span
                        className={`min-w-0 truncate ${
                          alive.has(p.player_id) ? "" : "text-muted line-through"
                        }`}
                      >
                        {p.display_name}
                        {p.is_bot ? " (봇)" : ""}
                        {!alive.has(p.player_id) ? " · 사망" : ""}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 tabular-nums">
                        {pub?.role_label ? (
                          <RoleName
                            role={pub.role}
                            label={pub.role_label}
                            className="text-xs font-medium"
                          />
                        ) : null}
                        <span className="min-w-[2.5rem] text-right font-medium">{p.score}</span>
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : (
          <div className={passPhonePrivate ? "flex min-h-full flex-col" : undefined}>

      {game.phase === "ROLE_REVEAL" && (
        <div
          className={
            passPhonePrivate ? "flex min-h-full flex-col gap-4" : "mt-5 space-y-4"
          }
        >
          {isMod && host && game.pass_device && (
            <>
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                <RoleRevealCard
                  role={game.pass_device.role}
                  label={game.pass_device.role_label}
                  name={game.pass_device.display_name}
                  index={game.pass_device.index}
                  total={game.pass_device.total}
                  peers={
                    game.pass_device.mafia_peers?.length
                      ? game.pass_device.mafia_peers.map((m) => m.display_name).join(", ")
                      : undefined
                  }
                />
              </div>
              <Button
                className="w-full shrink-0"
                disabled={busy}
                onClick={() => onAction("advance_reveal")}
              >
                확인함 · 다음
              </Button>
            </>
          )}
          {isMod && host && !game.pass_device && (
            <Button className="w-full" disabled={busy} onClick={() => onAction("finish_reveal")}>
              밤 시작
            </Button>
          )}
          {!isMod && game.my_role_label && (
            <RoleRevealCard
              role={game.my_role}
              label={game.my_role_label}
              peers={game.mafia_peers?.length ? peerNames(game.mafia_peers) : undefined}
            />
          )}
          {!isMod && host && (
            <Button className="w-full" disabled={busy} onClick={() => onAction("finish_reveal")}>
              전원 확인 · 밤 시작
            </Button>
          )}
        </div>
      )}

      {game.phase === "NIGHT" && (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-muted">밤입니다. 특수직업 행동을 입력하세요.</p>
          {isMod && host && (
            <>
              {needed.length > 0 ? (
                <>
                  <p className="break-keep text-xs text-muted">
                    권장 순서 · ①마피아 → 의사 → 경찰 → 스파이 → 자경단 (입력은 자유, 판정은 서버가 한 번에)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {needed.map((k, i) => {
                      const role = mafiaRoleFromNightKey(k);
                      return (
                        <MafiaRoleChip
                          key={k}
                          role={role}
                          nightKey={k}
                          label={nightKeyLabel(k)}
                          step={i + 1}
                          selected={currentNightKey === k}
                          disabled={busy}
                          onClick={() => setNightKey(k)}
                        />
                      );
                    })}
                  </div>
                  {currentNightKey && (
                    <p
                      className={`break-keep text-sm font-medium ${mafiaRoleTone(mafiaRoleFromNightKey(currentNightKey)).text}`}
                    >
                      {(() => {
                        const actorId = nightActorId(currentNightKey);
                        if (actorId) {
                          const actor = players.find((p) => p.player_id === actorId);
                          const r = roleMap?.[actorId]?.role_label;
                          return `${nightKeyLabel(currentNightKey)} · ${actor?.display_name ?? ""}${r ? `(${r}·본인)` : "(본인)"} · 대상 선택`;
                        }
                        if (currentNightKey === "mafia_kill") {
                          const mafias = players.filter(
                            (p) =>
                              alive.has(p.player_id) && roleMap?.[p.player_id]?.role === "mafia"
                          );
                          if (mafias.length) {
                            return `마피아 암살 · ${mafias.map((m) => `${m.display_name}(본인)`).join(", ")} · 대상 선택`;
                          }
                        }
                        return `${nightKeyLabel(currentNightKey)} · 대상 선택`;
                      })()}
                    </p>
                  )}
                  <div className="grid gap-2">
                    {alivePlayers.map((p) => {
                      const pub = roleMap?.[p.player_id];
                      const actorId = nightActorId(currentNightKey);
                      const isActor =
                        (actorId != null && p.player_id === actorId) ||
                        (currentNightKey === "mafia_kill" && pub?.role === "mafia");
                      return (
                        <Button
                          key={p.player_id}
                          variant="secondary"
                          className="w-full justify-start"
                          disabled={busy || !currentNightKey}
                          onClick={() =>
                            onAction("moderator_night_action", {
                              action_key: currentNightKey,
                              target_player_id: p.player_id,
                            })
                          }
                        >
                          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                            <span className="truncate">
                              {p.display_name}
                              {isActor ? " (본인)" : ""}
                            </span>
                            {pub?.role_label ? (
                              <RoleName
                                role={pub.role}
                                label={pub.role_label}
                                className="shrink-0 text-xs font-medium"
                              />
                            ) : null}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted">남은 행동 없음</p>
              )}
            </>
          )}
          {!isMod && game.my_role && game.my_role !== "citizen" && (
            <div className="grid gap-2">
              <p className={`inline-flex items-center gap-1.5 text-sm font-medium ${myTone.text}`}>
                <MafiaRoleGlyph role={game.my_role} className="h-4 w-4" />
                대상 선택 ({game.my_role_label})
              </p>
              {alivePlayers
                .filter((p) => p.player_id !== game.my_player_id)
                .map((p) => (
                  <Button
                    key={p.player_id}
                    variant="secondary"
                    className="w-full justify-start"
                    disabled={busy}
                    onClick={() =>
                      onAction("night_action", { target_player_id: p.player_id })
                    }
                  >
                    {p.display_name}
                  </Button>
                ))}
              {game.my_role === "doctor" && (
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    onAction("night_action", { target_player_id: game.my_player_id })
                  }
                >
                  나 자신을 치료
                </Button>
              )}
            </div>
          )}
          {!isMod && (!game.my_role || game.my_role === "citizen") && (
            <p className="text-sm text-muted">밤 행동이 없습니다. 기다려 주세요.</p>
          )}
        </div>
      )}

      {game.phase === "NIGHT_RESULT" && (
        <div className={`space-y-3 ${passPhonePrivate ? "flex min-h-full flex-col" : "mt-5"}`}>
          {(game.last_night?.public_log || []).map((line, i) => (
            <p key={i} className="shrink-0 text-sm text-foreground">
              {line}
            </p>
          ))}
          {!game.last_night?.public_log?.length && (
            <p className="shrink-0 text-sm text-muted">평화로운 밤이었습니다.</p>
          )}

          {/* Moderator: pass-phone investigate result cards */}
          {isMod && host && modInvestigates.length > 0 && (
            <div className={`space-y-3 ${passPhonePrivate ? "flex min-h-0 flex-1 flex-col" : ""}`}>
              <p className="break-keep text-xs text-muted">
                조사 결과 · 해당 플레이어에게만 보여 주세요 ({invIndex + 1}/
                {modInvestigates.length})
              </p>
              {(() => {
                const card = modInvestigates[Math.min(invIndex, modInvestigates.length - 1)];
                const tone = mafiaRoleTone(card.investigator_role);
                const resultTone =
                  card.type === "police" && card.is_mafia_side
                    ? mafiaRoleTone("mafia")
                    : card.type === "spy" && card.has_special_role
                      ? mafiaRoleTone("spy")
                      : { text: "text-foreground", soft: "bg-surface/60", border: "border-border" };
                return (
                  <div
                    className={`flex flex-1 flex-col items-center justify-center rounded-2xl border p-6 text-center sm:p-8 ${resultTone.soft} ${resultTone.border}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <MafiaRoleGlyph role={card.investigator_role} className="h-10 w-10" />
                      <p className={`text-sm font-medium ${tone.text}`}>
                        {card.investigator_role_label} · {card.investigator_name}
                      </p>
                    </div>
                    <p className="mt-4 text-sm text-muted">대상 · {card.target_name}</p>
                    <p className={`mt-3 text-3xl font-bold tracking-tight ${resultTone.text}`}>
                      {card.result_text}
                    </p>
                  </div>
                );
              })()}
              <div className="flex shrink-0 gap-2 pb-1">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={busy || invIndex <= 0}
                  onClick={() => setInvIndex((i) => Math.max(0, i - 1))}
                >
                  이전
                </Button>
                {invIndex < modInvestigates.length - 1 ? (
                  <Button
                    className="flex-1"
                    disabled={busy}
                    onClick={() => setInvIndex((i) => i + 1)}
                  >
                    다음 조사
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    disabled={busy}
                    onClick={() => onAction("ack_night_result")}
                  >
                    낮 토론으로
                  </Button>
                )}
              </div>
            </div>
          )}

          {isMod && host && modInvestigates.length === 0 && (
            <p className="text-sm text-muted">이번 밤 조사 결과 없음</p>
          )}

          {!isMod && game.my_investigate && (
            <div className="rounded-xl border border-border bg-surface/60 p-3 text-sm">
              {game.my_investigate.type === "police" ? (
                <p>
                  조사 결과:{" "}
                  {game.my_investigate.is_mafia_side ? (
                    <span className={mafiaRoleTone("mafia").text}>마피아 진영</span>
                  ) : (
                    <span>마피아 진영 아님</span>
                  )}
                </p>
              ) : (
                <p>
                  조사 결과:{" "}
                  {game.my_investigate.has_special_role ? "특수직업 있음" : "특수직업 없음"}
                </p>
              )}
            </div>
          )}

          {host && !(isMod && modInvestigates.length > 0) && (
            <Button className="w-full" disabled={busy} onClick={() => onAction("ack_night_result")}>
              낮 토론으로
            </Button>
          )}
        </div>
      )}

      {game.phase === "DAY_DISCUSSION" && (
        <div className="mt-5 space-y-3">
          <DiscussionTimer game={game} />
          <p className="text-sm text-muted">오프라인으로 토론하세요.</p>
          {host && (
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => onAction("end_discussion")}
            >
              {game.discussion_expired ? "시간 종료 · 투표 시작" : "투표 시작"}
            </Button>
          )}
        </div>
      )}

      {(game.phase === "VOTE" || game.phase === "REVOTE") && (
        <div className="mt-5 space-y-3">
          {game.phase === "REVOTE" && (
            <p className="text-sm text-accent">재투표입니다. 또 동률이면 무처형입니다.</p>
          )}
          {isMod && host ? (
            <>
              <p className="text-sm text-muted">오프라인 투표 결과를 반영하세요.</p>
              <div className="grid gap-2">
                {alivePlayers.map((p) => (
                  <Button
                    key={p.player_id}
                    variant="secondary"
                    className="w-full justify-start"
                    disabled={busy}
                    onClick={() =>
                      onAction("moderator_vote_result", { target_player_id: p.player_id })
                    }
                  >
                    {p.display_name} 처형
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  onClick={() => onAction("moderator_vote_result", { target_player_id: "none" })}
                >
                  무처형
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                {alivePlayers
                  .filter((p) => p.player_id !== game.my_player_id)
                  .map((p) => (
                    <Button
                      key={p.player_id}
                      variant="secondary"
                      className="w-full justify-start"
                      disabled={busy || game.day?.my_vote != null}
                      onClick={() => onAction("cast_vote", { target_player_id: p.player_id })}
                    >
                      {p.display_name}
                    </Button>
                  ))}
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={busy || game.day?.my_vote != null}
                  onClick={() => onAction("cast_vote", { target_player_id: "" })}
                >
                  기권
                </Button>
              </div>
              <p className="text-xs text-muted">
                투표 {game.day?.votes_cast ?? 0}/{alivePlayers.length}
              </p>
            </>
          )}
        </div>
      )}

      {game.phase === "EXECUTION" && (
        <div className="mt-5 space-y-3 text-center">
          {game.day?.accused ? (
            <p className="text-lg font-semibold text-foreground">
              처형:{" "}
              {players.find((p) => p.player_id === game.day?.accused)?.display_name}
            </p>
          ) : (
            <p className="text-lg font-semibold text-muted">무처형</p>
          )}
          {(game.day?.execution_deaths || []).map((d, i) => (
            <p
              key={i}
              className="inline-flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted"
            >
              {d.role_label ? (
                <>
                  직업 공개:
                  <MafiaRoleGlyph role={d.role} className="h-4 w-4" />
                  <RoleName role={d.role} label={d.role_label} className="font-medium" />
                </>
              ) : (
                "사망"
              )}
            </p>
          ))}
          {host && (
            <Button className="w-full" disabled={busy} onClick={() => onAction("ack_execution")}>
              계속
            </Button>
          )}
        </div>
      )}

      {game.phase === "ROUND_SCORE" && (
        <div className="mt-5 space-y-3">
          <p
            className={`text-center text-lg font-semibold ${
              game.round_winner === "mafia"
                ? mafiaRoleTone("mafia").text
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {game.round_winner === "mafia" ? "마피아 승" : "시민 승"}
          </p>
          <ul className="space-y-1 text-sm">
            {players.map((p) => {
              const pub = game.roles_public?.[p.player_id];
              return (
                <li key={p.player_id} className="flex justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    {p.display_name}
                    {pub?.role_label ? (
                      <>
                        <MafiaRoleGlyph role={pub.role} className="h-3.5 w-3.5" />
                        <RoleName role={pub.role} label={pub.role_label} />
                      </>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {(game.round_delta?.[p.player_id] ?? 0) >= 0 ? "+" : ""}
                    {game.round_delta?.[p.player_id] ?? 0} · 합 {p.score}
                  </span>
                </li>
              );
            })}
          </ul>
          {host && (
            <Button className="w-full" disabled={busy} onClick={() => onAction("ack_round_score")}>
              {game.current_round >= game.total_rounds ? "최종 결과" : "다음 라운드"}
            </Button>
          )}
        </div>
      )}

      {game.phase === "ENDED" && (
        <div className="mt-5 space-y-3 text-center">
          <p className="text-sm text-muted">
            {game.winner_tiebreak ? "동점 · 랜덤 우승" : "우승"}
          </p>
          <p className="text-2xl font-bold text-primary">
            {players.find((p) => p.player_id === game.winner_player_id)?.display_name}
          </p>
        </div>
      )}
          </div>
        )}
      </div>

      {!passPhonePrivate && (
        <div className="mt-3 flex shrink-0 gap-1 rounded-xl border border-border bg-surface/50 p-1">
          <button
            type="button"
            onClick={() => setTab("play")}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              tab === "play"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            진행
          </button>
          <button
            type="button"
            onClick={() => setTab("score")}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              tab === "score"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            생존 · 점수{showModRoles ? " · 역할" : ""}
          </button>
        </div>
      )}
    </Card>
  );
}
