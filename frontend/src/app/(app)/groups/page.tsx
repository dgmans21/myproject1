"use client";

import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RoomCreateForm } from "@/components/RoomCreateForm";
import { PendingInvitationsCard } from "@/components/PendingInvitationsCard";
import { RoomJoinCard } from "@/components/RoomJoinCard";
import { RoomActionMenu } from "@/components/RoomActionMenu";
import { GuestPromptModal } from "@/components/GuestPromptModal";
import { api, ROOM_TYPE_LABELS } from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";
import { useRoomStore } from "@/stores/room-store";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

export default function GroupsPage() {
  const { rooms, loading, fetchRooms, updateRoom, removeRoom } = useRoomStore();
  const [showCreate, setShowCreate] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState(false);
  const createFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRooms().catch(() => {});
  }, [fetchRooms]);

  useEffect(() => {
    if (!showCreate) return;
    requestAnimationFrame(() => {
      createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("room-create-name")?.focus();
    });
  }, [showCreate]);

  const handlePromote = async (id: string) => {
    try {
      const updated = await api.rooms.promote(id);
      updateRoom(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "승격 실패");
    }
  };

  const handleDelete = async (id: string) => {
    await api.rooms.delete(id);
    removeRoom(id);
  };

  const openCreate = () => {
    if (isGuestSession()) {
      setGuestPrompt(true);
      return;
    }
    setShowCreate((open) => !open);
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
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {showCreate ? "닫기" : "새 방"}
          </Button>
        </div>

        {showCreate && (
          <div ref={createFormRef} className="mt-6 scroll-mt-24">
            <RoomCreateForm onClose={() => setShowCreate(false)} />
          </div>
        )}

        <PendingInvitationsCard />
        <RoomJoinCard />

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
              <Card
                key={room.id}
                hover
                className="relative overflow-hidden"
                style={
                  room.accent_color
                    ? { borderLeftWidth: 4, borderLeftColor: room.accent_color }
                    : undefined
                }
              >
                <div className="absolute right-3 top-3 z-10">
                  <RoomActionMenu
                    room={room}
                    onPromote={handlePromote}
                    onDelete={handleDelete}
                  />
                </div>
                <Link href={`/groups/${room.id}`}>
                  <div className="flex items-start justify-between gap-8 pr-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          room.room_type === "TEAM_SCHEDULE"
                            ? "accent"
                            : room.room_type === "REGULAR"
                              ? "primary"
                              : "warm"
                        }
                      >
                        {ROOM_TYPE_LABELS[room.room_type]}
                      </Badge>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
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
              </Card>
            ))
          )}
        </div>
      </main>

      <GuestPromptModal
        open={guestPrompt}
        action="room_manage"
        onClose={() => setGuestPrompt(false)}
      />
    </div>
  );
}
