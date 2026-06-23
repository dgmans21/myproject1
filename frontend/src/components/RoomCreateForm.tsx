"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { useRoomStore } from "@/stores/room-store";
import { RoomCreate } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Crown, Zap } from "lucide-react";

interface RoomCreateFormProps {
  onClose: () => void;
}

function defaultExpireDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function RoomCreateForm({ onClose }: RoomCreateFormProps) {
  const addRoom = useRoomStore((s) => s.addRoom);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [roomType, setRoomType] = useState<"ONE_TIME" | "REGULAR">("ONE_TIME");
  const [expireDate, setExpireDate] = useState(defaultExpireDate);
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { api } = await import("@/lib/api");
      const payload: RoomCreate = {
        name: name.trim(),
        description: description || undefined,
        purpose: purpose || undefined,
        room_type: roomType,
        expire_date: roomType === "ONE_TIME" ? expireDate : undefined,
      };
      const room = await api.rooms.create(payload);
      addRoom(room);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "방 생성 실패");
    } finally {
      setCreating(false);
    }
  }, [name, description, purpose, roomType, expireDate, addRoom, onClose]);

  return (
    <Card className="mt-6">
      <CardTitle>방 만들기</CardTitle>
      <div className="mt-4 space-y-4">
        <Input label="방 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder="이번 주말 모임" />
        <Input label="목적" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="저녁 회식, 스터디 등" />
        <Textarea label="설명 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">방 유형</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRoomType("ONE_TIME")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                roomType === "ONE_TIME"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-primary/40"
              )}
            >
              <Zap className="h-4 w-4" /> 임시방
            </button>
            <button
              type="button"
              onClick={() => setRoomType("REGULAR")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                roomType === "REGULAR"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted hover:border-primary/40"
              )}
            >
              <Crown className="h-4 w-4" /> 고정방
            </button>
          </div>
        </div>

        {roomType === "ONE_TIME" ? (
          <Input
            label="터트릴 날짜"
            type="date"
            value={expireDate}
            onChange={(e) => setExpireDate(e.target.value)}
          />
        ) : (
          <p className="text-xs text-muted">고정방은 만료일이 없습니다. 3개월 미활동 시 정리됩니다.</p>
        )}

        {roomType === "ONE_TIME" && (
          <p className="text-xs text-muted">임시방은 만료일이 지나면 자동 삭제됩니다.</p>
        )}

        <Button onClick={handleCreate} disabled={creating || !name.trim()} variant="accent">
          {roomType === "ONE_TIME" ? "임시방 만들기" : "고정방 만들기"}
        </Button>
      </div>
    </Card>
  );
}
