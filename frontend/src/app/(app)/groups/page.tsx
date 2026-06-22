"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { api, Room, ROOM_TYPE_LABELS } from "@/lib/api";
import { Plus, Users, Zap, Crown, Trash2 } from "lucide-react";
import Link from "next/link";

export default function GroupsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [creating, setCreating] = useState(false);

  const loadRooms = async () => {
    try {
      const data = await api.rooms.list();
      setRooms(data);
    } catch {
      /* API not connected */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, []);

  const handleCreate = async (type: "ONE_TIME" | "REGULAR") => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const room = await api.rooms.create({
        name,
        description: description || undefined,
        purpose: purpose || undefined,
        room_type: type,
      });
      setRooms((prev) => [room, ...prev]);
      setShowCreate(false);
      setName("");
      setDescription("");
      setPurpose("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "방 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const handlePromote = async (id: string) => {
    try {
      const updated = await api.rooms.promote(id);
      setRooms((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "승격 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("일회성 방을 삭제하시겠습니까?")) return;
    try {
      await api.rooms.delete(id);
      setRooms((prev) => prev.filter((r) => r.id !== id));
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
            <p className="mt-1 text-muted">휘발성 방 · 정식 그룹 · 3개월 미활동 시 아카이브</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            새 방
          </Button>
        </div>

        {showCreate && (
          <Card className="mt-6">
            <CardTitle>방 만들기</CardTitle>
            <div className="mt-4 space-y-4">
              <Input label="방 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder="이번 주말 모임" />
              <Input label="목적" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="저녁 회식, 스터디 등" />
              <Textarea label="설명 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              <div className="flex gap-3">
                <Button onClick={() => handleCreate("ONE_TIME")} disabled={creating} variant="accent">
                  <Zap className="h-4 w-4" />
                  일회성 방
                </Button>
                <Button onClick={() => handleCreate("REGULAR")} disabled={creating}>
                  <Crown className="h-4 w-4" />
                  정식 그룹
                </Button>
              </div>
            </div>
          </Card>
        )}

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
