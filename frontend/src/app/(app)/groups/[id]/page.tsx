"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { api, Appointment, Group, STATUS_LABELS } from "@/lib/api";
import { Plus, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.groups.get(id).then(setGroup).catch(() => {});
    api.appointments.listByGroup(id).then(setAppointments).catch(() => {});
  }, [id]);

  const handleCreate = async () => {
    if (!title.trim() || !id) return;
    setCreating(true);
    try {
      const apt = await api.appointments.create({
        group_id: id,
        title,
        description: description || undefined,
      });
      setAppointments((prev) => [apt, ...prev]);
      setShowCreate(false);
      setTitle("");
      setDescription("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "약속 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> 그룹 목록
        </Link>

        {group && (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
                <Badge variant={group.group_type === "formal" ? "primary" : "warm"}>
                  {group.group_type === "formal" ? "정식" : "일회성"}
                </Badge>
              </div>
              {group.purpose && <p className="mt-1 text-muted">{group.purpose}</p>}
            </div>
            <Button onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4" /> 새 약속
            </Button>
          </div>
        )}

        {showCreate && (
          <Card className="mt-6">
            <CardTitle>약속 만들기</CardTitle>
            <div className="mt-4 space-y-4">
              <Input label="약속 제목" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="팀 회식" />
              <Textarea label="설명 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              <Button onClick={handleCreate} disabled={creating}>약속 생성 & 1차 투표 시작</Button>
            </div>
          </Card>
        )}

        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">약속 목록</h2>
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-10 w-10 text-muted/40" />
              <p className="mt-3 text-muted">아직 약속이 없습니다</p>
            </div>
          ) : (
            appointments.map((apt) => (
              <Link key={apt.id} href={`/groups/${id}/appointments/${apt.id}`}>
                <Card hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{apt.title}</CardTitle>
                      {apt.description && <CardDescription>{apt.description}</CardDescription>}
                    </div>
                    <Badge variant={
                      apt.status === "confirmed" ? "accent" :
                      apt.status === "date_voting" ? "primary" :
                      apt.status === "time_voting" ? "warm" : "default"
                    }>
                      {STATUS_LABELS[apt.status]}
                    </Badge>
                  </div>
                  {apt.confirmed_date && (
                    <p className="mt-2 text-sm text-accent font-medium">
                      {apt.confirmed_date} {apt.confirmed_time?.slice(0, 5)} 확정
                    </p>
                  )}
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
