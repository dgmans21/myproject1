"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { MemberPickerModal } from "@/components/MemberPickerModal";
import { api, HostTransferStatus } from "@/lib/api";
import { Crown, UserCheck, UserX } from "lucide-react";

interface RoomHostTransferPanelProps {
  roomId: string;
  onUpdated?: () => void;
}

export function RoomHostTransferPanel({ roomId, onUpdated }: RoomHostTransferPanelProps) {
  const [status, setStatus] = useState<HostTransferStatus | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    const s = await api.rooms.hostTransferStatus(roomId);
    setStatus(s);
  }, [roomId]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const handleRequest = async (targetUserId: string) => {
    setSubmitting(true);
    try {
      await api.rooms.requestHostTransfer(roomId, targetUserId);
      setPickerOpen(false);
      await reload();
      onUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "인도 요청 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (accept: boolean) => {
    setSubmitting(true);
    try {
      await api.rooms.respondHostTransfer(roomId, accept);
      await reload();
      onUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "응답 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await api.rooms.cancelHostTransfer(roomId);
      await reload();
      onUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "요청 취소 실패");
    } finally {
      setSubmitting(false);
    }
  };

  if (!status) return null;

  return (
    <>
      <Card>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-4 w-4 text-warm" /> 방장
        </CardTitle>
        <CardDescription className="mt-1">
          방장이 없으면 첫 약속 생성자가 방장이 됩니다. 방장은 멤버에게 수락형 인도만 할 수
          있어요.
        </CardDescription>

        <div className="mt-4 space-y-3 text-sm">
          {status.owner_user_id ? (
            <p>
              현재 방장:{" "}
              <strong className="text-foreground">
                {status.owner_display_name}
                {status.is_me_owner && " (나)"}
              </strong>
            </p>
          ) : (
            <p className="rounded-lg bg-warm/10 px-3 py-2 text-warm">
              방장 없음 — 이 방에서 첫 약속을 만들면 생성자가 방장이 됩니다.
            </p>
          )}

          {status.pending && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 space-y-2">
              <p>
                <strong>{status.pending.from_display_name}</strong> →{" "}
                <strong>{status.pending.to_display_name}</strong> 방장 인도 요청 중
              </p>
              {status.pending.is_for_me ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleRespond(true)} disabled={submitting}>
                    <UserCheck className="h-3.5 w-3.5" /> 수락
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRespond(false)}
                    disabled={submitting}
                  >
                    <UserX className="h-3.5 w-3.5" /> 거절
                  </Button>
                </div>
              ) : status.is_me_owner ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={handleCancel} disabled={submitting}>
                    요청 취소
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted">대상 멤버의 수락을 기다리는 중입니다.</p>
              )}
            </div>
          )}

          {status.is_me_owner && !status.pending && status.transfer_candidates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setPickerOpen(true)} disabled={submitting}>
                <Crown className="h-3.5 w-3.5" /> 멤버 선택해서 방장 넘기기
              </Button>
              <span className="text-xs text-muted">
                인도 가능 {status.transfer_candidates.length}명
              </span>
            </div>
          )}
        </div>
      </Card>

      <MemberPickerModal
        open={pickerOpen}
        title="인도할 멤버"
        items={status.transfer_candidates}
        confirmLabel="방장 넘기기 요청"
        emptyMessage="인도할 멤버가 없습니다."
        footerHint={`멤버 ${status.transfer_candidates.length}명 · 선택 후 상대가 수락하면 방장이 바뀝니다`}
        submitting={submitting}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleRequest}
      />
    </>
  );
}
