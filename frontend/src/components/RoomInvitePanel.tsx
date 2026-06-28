"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FriendInviteModal } from "@/components/FriendInviteModal";
import { api, FriendSummary, HostTransferStatus } from "@/lib/api";
import { UserPlus, Users, Lock } from "lucide-react";

interface RoomInvitePanelProps {
  roomId: string;
}

/** 방장: 친구 초대 + 입장 비밀번호 설정 (mock) */
export function RoomInvitePanel({ roomId }: RoomInvitePanelProps) {
  const [hostStatus, setHostStatus] = useState<HostTransferStatus | null>(null);
  const [candidates, setCandidates] = useState<FriendSummary[]>([]);
  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const [joinPassword, setJoinPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    const [host, friends, room] = await Promise.all([
      api.rooms.hostTransferStatus(roomId),
      api.rooms.listInviteCandidates(roomId),
      api.rooms.get(roomId),
    ]);
    setHostStatus(host);
    setCandidates(friends);
    setHasPassword(Boolean(room.requires_join_password));
  }, [roomId]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const handleInvite = async (inviteeIds: string[]) => {
    if (inviteeIds.length === 0) return;
    setSubmitting(true);
    try {
      const result = await api.rooms.inviteMembers(roomId, inviteeIds);
      if (result.failed.length > 0) {
        alert(
          `${result.invited_count}명에게 초대를 보냈습니다.\n` +
            result.failed.map((f) => `${f.display_name}: ${f.message}`).join("\n")
        );
      } else {
        alert(`${result.invited_count}명에게 초대를 보냈습니다`);
      }
      setFriendModalOpen(false);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "초대 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePassword = async () => {
    setSubmitting(true);
    try {
      const res = await api.rooms.setJoinPassword(roomId, joinPassword.trim() || null);
      setHasPassword(res.requires_join_password);
      setJoinPassword("");
      alert(res.requires_join_password ? "입장 비밀번호가 설정되었습니다" : "입장 비밀번호가 해제되었습니다");
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hostStatus?.is_me_owner) return null;

  return (
    <>
      <Card className="mt-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" /> 멤버 초대
        </CardTitle>
        <CardDescription className="mt-1">
          친구 여러 명을 한 번에 선택해 초대할 수 있습니다.
        </CardDescription>

        {candidates.length === 0 ? (
          <p className="mt-4 text-sm text-muted">초대할 친구가 없습니다.</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setFriendModalOpen(true)} disabled={submitting}>
              <UserPlus className="h-3.5 w-3.5" /> 친구 선택해서 초대
            </Button>
            <span className="text-xs text-muted">초대 가능 {candidates.length}명</span>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Lock className="h-4 w-4" /> 입장 비밀번호
            {hasPassword && (
              <span className="text-xs font-normal text-accent">설정됨</span>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">
            실서비스에서는 DB에 해시만 저장하고 서버에서 검증합니다. mock은 메모리에만 보관합니다.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Input
              label="새 비밀번호 (비우고 저장하면 해제)"
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="4자 이상"
              className="min-w-[200px] flex-1"
            />
            <Button size="sm" variant="secondary" onClick={handleSavePassword} disabled={submitting}>
              저장
            </Button>
          </div>
        </div>
      </Card>

      <FriendInviteModal
        open={friendModalOpen}
        friends={candidates}
        inviting={submitting}
        onClose={() => setFriendModalOpen(false)}
        onInvite={handleInvite}
      />
    </>
  );
}
