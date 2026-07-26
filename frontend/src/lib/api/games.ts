import { apiFetch, getAccessToken } from "@/lib/api/http-client";
import { getApiBaseUrl } from "@/lib/api-config";

export type PlayMode = "moderator" | "remote";

export type LiarPhase =
  | "WAITING"
  | "ROLE_REVEAL"
  | "DISCUSSION"
  | "VOTE"
  | "REVEAL"
  | "GUESS"
  | "ROUND_SCORE"
  | "ENDED";

export interface GamePlayer {
  player_id: string;
  display_name: string;
  user_id: string | null;
  score: number;
  is_bot: boolean;
}

export interface RoleCard {
  category_name: string;
  is_liar: boolean;
  word?: string;
  player_id?: string;
  display_name?: string;
  index?: number;
  total?: number;
}

export interface GameView {
  game_id: string;
  game_type: string;
  room_id: string;
  host_user_id: string;
  play_mode: PlayMode;
  phase: LiarPhase;
  total_rounds: number;
  current_round: number;
  phase_started_at: string;
  phase_duration_seconds: number | null;
  ended: boolean;
  winner_player_id: string | null;
  winner_tiebreak?: boolean;
  players: GamePlayer[];
  category_id: string;
  category_name: string;
  liar_mode: string;
  discussion_seconds: number;
  is_host: boolean;
  my_player_id: string | null;
  role_card: RoleCard | null;
  pass_device: RoleCard | null;
  i_am_liar?: boolean;
  round: {
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
    body: {
      play_mode: PlayMode;
      total_rounds: number;
      category_id: string;
      discussion_seconds?: number;
      player_names?: string[];
      host_joins?: boolean;
      player_user_ids?: string[];
    }
  ) {
    return apiFetch<{ game: GameView }>(`/rooms/${roomId}/games/start`, {
      method: "POST",
      body: JSON.stringify({ game_type: "liar", liar_mode: "category_only", ...body }),
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
