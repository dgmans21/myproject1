import { apiFetch, getAccessToken } from "@/lib/api/http-client";
import { getApiBaseUrl } from "@/lib/api-config";

export type PlayMode = "moderator" | "remote";
export type LiarMode = "category_only" | "fake_word";
export type TopicPolicy = "fixed" | "random_each_round";

export const PLAY_MODE_LABELS: Record<PlayMode, string> = {
  moderator: "사회자 테이블",
  remote: "온라인 파티",
};

export const LIAR_MODE_LABELS: Record<LiarMode, string> = {
  category_only: "일반",
  fake_word: "가짜 정답",
};

export const TOPIC_POLICY_LABELS: Record<TopicPolicy, string> = {
  fixed: "주제 고정",
  random_each_round: "매판 랜덤",
};

export type LiarPhase =
  | "WAITING"
  | "ROLE_REVEAL"
  | "DISCUSSION"
  | "VOTE"
  | "REVEAL"
  | "GUESS"
  | "ROUND_SCORE"
  | "ENDED"
  | "NIGHT"
  | "NIGHT_RESULT"
  | "DAY_DISCUSSION"
  | "REVOTE"
  | "EXECUTION";

export interface GamePlayer {
  player_id: string;
  display_name: string;
  user_id: string | null;
  score: number;
  is_bot: boolean;
  alive?: boolean;
}

export interface RoleCard {
  category_name?: string;
  is_liar?: boolean;
  word?: string;
  is_decoy?: boolean;
  player_id?: string;
  display_name?: string;
  index?: number;
  total?: number;
  role?: string;
  role_label?: string;
  mafia_peers?: { player_id: string; display_name: string }[];
}

export interface GameView {
  game_id: string;
  game_type: string;
  room_id: string;
  host_user_id: string;
  play_mode: PlayMode;
  phase: LiarPhase | string;
  total_rounds: number;
  current_round: number;
  phase_started_at: string;
  phase_duration_seconds: number | null;
  ended: boolean;
  winner_player_id: string | null;
  winner_tiebreak?: boolean;
  players: GamePlayer[];
  // liar
  category_id?: string;
  category_name?: string;
  topic_policy?: TopicPolicy | string;
  liar_mode?: string;
  discussion_seconds?: number;
  discussion_expired?: boolean;
  is_host: boolean;
  my_player_id: string | null;
  role_card?: RoleCard | null;
  pass_device?: RoleCard | null;
  i_am_liar?: boolean;
  round?: {
    reveal_index: number;
    revealed_count: number;
    player_count: number;
    votes_cast: number;
    my_vote: string | null;
    accused_player_id: string | null;
    arrest_success: boolean | null;
    guess_correct: boolean | null;
    round_delta: Record<string, number> | null;
    liar_player_id: string | null;
    word: string | null;
  };
  // mafia
  my_role?: string | null;
  my_role_label?: string | null;
  mafia_peers?: string[] | { player_id: string; display_name: string }[];
  alive_player_ids?: string[];
  night_needed?: string[];
  night_actions_count?: number;
  last_night?: {
    deaths: { player_id: string; reason?: string; role?: string; role_label?: string }[];
    public_log: string[];
  } | null;
  my_investigate?: {
    type: string;
    target_player_id: string;
    is_mafia_side?: boolean;
    has_special_role?: boolean;
  } | null;
  moderator_investigates?: {
    investigator_id: string;
    investigator_name: string;
    investigator_role: string;
    investigator_role_label: string;
    type: string;
    target_player_id: string;
    target_name: string;
    result_text: string;
    is_mafia_side?: boolean;
    has_special_role?: boolean;
  }[];
  day?: {
    votes_cast: number;
    my_vote: string | null;
    accused: string | null;
    execution_deaths?: { player_id: string; role?: string; role_label?: string }[] | null;
    revote?: boolean;
  };
  round_winner?: string | null;
  round_delta?: Record<string, number> | null;
  roles_public?: Record<string, { role: string; role_label: string }> | null;
  moderator_roles?: Record<string, { role: string; role_label: string }> | null;
  revealed_roles?: Record<string, { role: string; role_label: string }> | null;
  role_reveal_on_death?: boolean;
  turn_index?: number;
  night_index?: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  word_count: number;
}

export function getWsBaseUrl(): string {
  const http = getApiBaseUrl();
  if (http.startsWith("https://")) return `wss://${http.slice("https://".length)}`;
  if (http.startsWith("http://")) return `ws://${http.slice("http://".length)}`;
  return `ws://${http}`;
}

export async function buildGameWsUrl(roomId: string, gameId: string): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const base = getWsBaseUrl();
  return `${base}/api/v1/rooms/${roomId}/games/${gameId}/ws?token=${encodeURIComponent(token)}`;
}

export const gamesApi = {
  categories(roomId: string) {
    return apiFetch<{ categories: CategoryItem[] }>(`/rooms/${roomId}/games/categories`);
  },
  active(roomId: string) {
    return apiFetch<{ game: GameView | null }>(`/rooms/${roomId}/games/active`);
  },
  start(
    roomId: string,
    body: Record<string, unknown> & {
      game_type?: "liar" | "mafia";
      play_mode: PlayMode;
      total_rounds: number;
    }
  ) {
    return apiFetch<{ game: GameView }>(`/rooms/${roomId}/games/start`, {
      method: "POST",
      body: JSON.stringify({
        game_type: body.game_type ?? "liar",
        ...body,
      }),
    });
  },
  action(roomId: string, gameId: string, action: string, data?: Record<string, unknown>) {
    return apiFetch<{ game: GameView }>(`/rooms/${roomId}/games/${gameId}/action`, {
      method: "POST",
      body: JSON.stringify({ action, data: data ?? null }),
    });
  },
  forceEnd(roomId: string, gameId: string) {
    return apiFetch<{ game: GameView }>(`/rooms/${roomId}/games/${gameId}`, {
      method: "DELETE",
    });
  },
};
