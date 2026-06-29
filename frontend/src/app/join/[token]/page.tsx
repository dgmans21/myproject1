"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { GuestPromptModal } from "@/components/GuestPromptModal";
import { api, InviteTokenPreview } from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";
import { Eye, Users } from "lucide-react";

export default function JoinByInvitePage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [preview, setPreview] = useState<InviteTokenPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState(false);
  const guest = isGuestSession();

  useEffect(() => {
    if (!token) return;
    api.rooms
      .previewInviteToken(token)
      .then(setPreview)
      .catch((e) => setError(e instanceof Error ? e.message : "링크를 확인할 수 없습니다"));
  }, [token]);

  const handleJoin = async () => {
    if (guest) {
      setGuestPrompt(true);
      return;
    }
    setJoining(true);
    try {
      const res = await api.rooms.joinByInviteToken(token);
      router.push(`/groups/${res.room.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "입장 실패");
    } finally {
      setJoining(false);
    }
  };

  const handleBrowse = () => {
    if (!preview || preview.expired) return;
    router.push(`/groups/${preview.room_id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> 방 초대
          </CardTitle>
          <CardDescription className="mt-2">
            초대 링크로 방에 참여하거나 둘러볼 수 있습니다.
          </CardDescription>

          {error && <p className="mt-4 text-sm text-warm">{error}</p>}

          {preview && (
            <div className="mt-4 space-y-3">
              <p className="text-lg font-semibold text-foreground">{preview.room_name}</p>
              {preview.expired ? (
                <p className="text-sm text-warm">만료된 링크입니다. 방장에게 새 링크를 요청하세요.</p>
              ) : (
                <p className="text-xs text-muted">
                  만료일: {new Date(preview.expires_at).toLocaleDateString("ko-KR")}
                </p>
              )}
              {preview.requires_join_password && (
                <p className="text-xs text-muted">이 방은 입장 비밀번호가 설정되어 있을 수 있습니다.</p>
              )}
              {preview.is_member ? (
                <Link href={`/groups/${preview.room_id}`}>
                  <Button className="w-full">이미 참여 중 — 방으로 이동</Button>
                </Link>
              ) : preview.expired ? null : guest ? (
                <div className="space-y-2">
                  <Button className="w-full" variant="secondary" onClick={handleBrowse}>
                    <Eye className="h-4 w-4" /> 방 둘러보기
                  </Button>
                  <Button className="w-full" onClick={() => setGuestPrompt(true)}>
                    회원으로 참여하기
                  </Button>
                </div>
              ) : (
                <Button className="w-full" disabled={joining} onClick={handleJoin}>
                  {joining ? "입장 중…" : "방 참여하기"}
                </Button>
              )}
            </div>
          )}

          {!preview && !error && (
            <p className="mt-4 text-sm text-muted">초대 정보를 불러오는 중…</p>
          )}
        </Card>
      </main>

      <GuestPromptModal
        open={guestPrompt}
        action="room_manage"
        onClose={() => setGuestPrompt(false)}
      />
    </div>
  );
}
