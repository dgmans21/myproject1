"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildGameWsUrl, gamesApi, type GameView } from "@/lib/api/games";

type ConnStatus = "connecting" | "open" | "closed" | "error";

export function useGameSocket(roomId: string, gameId: string) {
  const [game, setGame] = useState<GameView | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    async function connect() {
      setStatus("connecting");
      const url = await buildGameWsUrl(roomId, gameId);
      if (!url || cancelled) {
        setStatus("error");
        setError("로그인이 필요합니다");
        return;
      }
      ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        if (!cancelled) setStatus("open");
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            type: string;
            payload?: GameView;
            message?: string;
          };
          if (msg.type === "state" && msg.payload) {
            setGame(msg.payload);
            setError(null);
          } else if (msg.type === "error") {
            setError(msg.message || "오류");
          }
        } catch {
          /* ignore */
        }
      };
      ws.onerror = () => {
        if (!cancelled) {
          setStatus("error");
          setError("연결 오류");
        }
      };
      ws.onclose = () => {
        if (!cancelled) setStatus("closed");
        wsRef.current = null;
      };
    }

    connect();
    return () => {
      cancelled = true;
      if (pingTimer) clearInterval(pingTimer);
      ws?.close();
      wsRef.current = null;
    };
  }, [roomId, gameId]);

  const sendAction = useCallback(async (action: string, data?: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "action", action, data: data ?? {} }));
      return;
    }
    // REST fallback
    const res = await gamesApi.action(roomId, gameId, action, data);
    setGame(res.game);
  }, [roomId, gameId]);

  return { game, setGame, status, error, sendAction };
}
