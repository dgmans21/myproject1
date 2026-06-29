"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { api, InviteLinkInfo } from "@/lib/api";
import { canManageRoom } from "@/lib/permissions";
import { Copy, Link2, RefreshCw } from "lucide-react";

interface InviteLinkPanelProps {
  roomId: string;
  isOwner: boolean;
}

/** URL 초대 링크 (토큰·만료·재생성 — mock) */
export function InviteLinkPanel({ roomId, isOwner }: InviteLinkPanelProps) {
  const [info, setInfo] = useState<InviteLinkInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    if (!canManageRoom(isOwner)) return;
    setLoading(true);
    try {
      const data = await api.rooms.getInviteLink(roomId);
      setInfo(data);
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [roomId, isOwner]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  if (!canManageRoom(isOwner)) return null;

  const fullUrl =
    typeof window !== "undefined" && info
      ? `${window.location.origin}/join/${info.token}`
      : info?.url ?? "";

  const copyLink = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("링크 복사에 실패했습니다");
    }
  };

  const regenerate = async () => {
    if (!confirm("기존 초대 링크는 더 이상 사용할 수 없습니다. 새 링크를 만드시겠습니까?")) return;
    setLoading(true);
    try {
      const data = await api.rooms.regenerateInviteLink(roomId);
      setInfo(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "링크 재생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 border-primary/20">
      <CardTitle className="flex items-center gap-2 text-base">
        <Link2 className="h-4 w-4 text-primary" /> URL 초대
      </CardTitle>
      <CardDescription className="mt-1">
        카카오톡·문자·메일 등으로 공유할 수 있는 초대 링크입니다.
      </CardDescription>

      {loading && !info ? (
        <p className="mt-3 text-sm text-muted">링크 불러오는 중…</p>
      ) : info ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs break-all text-foreground">
            {fullUrl}
          </div>
          <p className="text-xs text-muted">
            만료: {new Date(info.expires_at).toLocaleDateString("ko-KR")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={copyLink} disabled={!fullUrl}>
              <Copy className="h-3.5 w-3.5" />
              {copied ? "복사됨" : "링크 복사"}
            </Button>
            <Button size="sm" variant="ghost" onClick={regenerate} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> 링크 재생성
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
