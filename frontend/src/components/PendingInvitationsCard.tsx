"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { api, RoomInvitationItem } from "@/lib/api";
import { useRoomStore } from "@/stores/room-store";
import { Mail } from "lucide-react";

export function PendingInvitationsCard() {
  const router = useRouter();
  const addRoom = useRoomStore((s) => s.addRoom);
  const [items, setItems] = useState<RoomInvitationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.rooms.listMyInvitations();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const handleAccept = async (roomId: string) => {
    try {
      const res = await api.rooms.acceptInvitation(roomId);
      addRoom(res.room);
      await reload();
      router.push(`/groups/${roomId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "수락 실패");
    }
  };

  const handleReject = async (roomId: string) => {
    try {
      await api.rooms.rejectInvitation(roomId);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "거절 실패");
    }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <Card className="mt-6 border-primary/30 bg-primary/5">
      <CardTitle className="flex items-center gap-2 text-base">
        <Mail className="h-4 w-4 text-primary" /> 받은 초대
      </CardTitle>
      <CardDescription className="mt-1">수락하면 방 멤버가 됩니다.</CardDescription>
      <ul className="mt-4 space-y-3">
        {items.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-3"
          >
            <div>
              <p className="font-medium text-foreground">{inv.room_name}</p>
              <p className="text-xs text-muted">{inv.inviter_display_name}님의 초대</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleAccept(inv.room_id)}>
                수락
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleReject(inv.room_id)}>
                거절
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
