"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RoomCreateForm } from "@/components/RoomCreateForm";
import { api, ROOM_TYPE_LABELS } from "@/lib/api";
import { useRoomStore } from "@/stores/room-store";
import { Plus, Users, Crown, Trash2 } from "lucide-react";
import Link from "next/link";

export default function GroupsPage() {
  const { rooms, loading, fetchRooms, updateRoom, removeRoom } = useRoomStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchRooms().catch(() => {});
  }, [fetchRooms]);

  const handlePromote = async (id: string) => {
    try {
      const updated = await api.rooms.promote(id);
      updateRoom(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "승격 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("한 번 만나기 방을 삭제하시겠습니까?")) return;
    try {
      await api.rooms.delete(id);
      removeRoom(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">방</h1>
            <p className="mt-1 text-muted">임시방 · 고정방 · 3개월 약속 없으면 보관</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            새 방
          </Button>
        </div>

        {showCreate && <RoomCreateForm onClose={() => setShowCreate(false)} />}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="text-muted col-span-full text-center py-12">불러오는 중...</p>
          ) : rooms.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <Users className="mx-auto h-12 w-12 text-muted/40" />
              <p className="mt-4 text-muted">아직 방이 없습니다. 새 방을 만들어보세요!</p>
            </div>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} hover className="relative">
                <Link href={`/groups/${room.id}`}>
                  <div className="flex items-start justify-between">
                    <Badge variant={room.room_type === "REGULAR" ? "primary" : "warm"}>
                      {ROOM_TYPE_LABELS[room.room_type]}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Users className="h-3.5 w-3.5" />
                      {room.member_count}명
                    </span>
                  </div>
                  <CardTitle className="mt-3">{room.name}</CardTitle>
                  {room.purpose && <CardDescription>{room.purpose}</CardDescription>}
                  {room.expire_at && (
                    <p className="mt-2 text-xs text-warm">
                      만료 {room.expire_at.slice(0, 10)}
                    </p>
                  )}
                </Link>
                <div className="mt-4 flex gap-2">
                  {room.room_type === "ONE_TIME" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => handlePromote(room.id)}>
                        <Crown className="h-3.5 w-3.5" />
                        승격
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(room.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
