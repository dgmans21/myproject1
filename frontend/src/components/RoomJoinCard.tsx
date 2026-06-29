"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, JoinPreview } from "@/lib/api";
import { useRoomStore } from "@/stores/room-store";
import { KeyRound } from "lucide-react";

/** 비밀번호로 방 입장 (mock — 실서비스는 서버에서 해시 검증) */
export function RoomJoinCard() {
  const router = useRouter();
  const addRoom = useRoomStore((s) => s.addRoom);
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!roomId.trim()) {
      setPreview(null);
      return;
    }
    try {
      const p = await api.rooms.previewJoin(roomId.trim());
      setPreview(p);
    } catch {
      setPreview(null);
    }
  }, [roomId]);

  useEffect(() => {
    const t = setTimeout(loadPreview, 400);
    return () => clearTimeout(t);
  }, [loadPreview]);

  const handleJoin = async () => {
    if (!roomId.trim() || !password) return;
    setSubmitting(true);
    try {
      const room = await api.rooms.joinWithPassword(roomId.trim(), password);
      addRoom(room);
      router.push(`/groups/${room.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "입장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardTitle className="flex items-center gap-2 text-base">
        <KeyRound className="h-4 w-4 text-primary" /> 비밀번호로 방 참가
      </CardTitle>
      <CardDescription className="mt-1">
        방장이 알려준 방 ID와 입장 비밀번호를 입력하세요.
      </CardDescription>
      <div className="mt-4 space-y-3">
        <Input
          label="방 이름"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="방 이름"
        />
        {preview && (
          <p className="text-xs text-muted">
            {preview.is_member
              ? `"${preview.room_name}" — 이미 멤버입니다`
              : `"${preview.room_name}" — ${
                  preview.requires_join_password ? "비밀번호 필요" : "초대 수락 필요"
                }`}
          </p>
        )}
        <Input
          label="입장 비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="방장이 알려준 비밀번호"
        />
        <Button
          size="sm"
          onClick={handleJoin}
          disabled={submitting || !roomId.trim() || !password || preview?.is_member}
        >
          참가하기
        </Button>
      </div>
    </Card>
  );
}
