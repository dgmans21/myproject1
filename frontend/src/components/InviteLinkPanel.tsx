"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { api, InviteLinkInfo } from "@/lib/api";
import { canManageRoom } from "@/lib/permissions";
import { buildInviteJoinUrl } from "@/lib/shareable-origin";
import { ChevronDown, ChevronUp, Copy, Link2, RefreshCw, Share2 } from "lucide-react";

interface InviteLinkPanelProps {
  roomId: string;
  /** 바깥 CollapsibleSection 안에서 쓸 때 카드 래핑 생략 */
  embedded?: boolean;
}

function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** URL 초대 링크 (토큰·만료·재생성) — 방장 전용. 긴 URL은 기본 숨김. */
export function InviteLinkPanel({ roomId, embedded = false }: InviteLinkPanelProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [ownerChecked, setOwnerChecked] = useState(false);
  const [info, setInfo] = useState<InviteLinkInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(canNativeShare());
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.rooms
      .hostTransferStatus(roomId)
      .then((status) => {
        if (!cancelled) {
          setIsOwner(Boolean(status.is_me_owner));
          setOwnerChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsOwner(false);
          setOwnerChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

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
    if (!ownerChecked || !isOwner) return;
    reload().catch(() => {});
  }, [ownerChecked, isOwner, reload]);

  if (!ownerChecked || !canManageRoom(isOwner)) return null;

  const fullUrl = info ? buildInviteJoinUrl(info.token) : "";

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

  const shareLink = async () => {
    if (!fullUrl) return;
    if (!canNativeShare()) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: "방 초대",
        text: "방에 함께 참여해 주세요",
        url: fullUrl,
      });
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우는 무시
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyLink();
    }
  };

  const regenerate = async () => {
    if (!confirm("기존 초대 링크는 더 이상 사용할 수 없습니다. 새 링크를 만드시겠습니까?")) return;
    setLoading(true);
    try {
      const data = await api.rooms.regenerateInviteLink(roomId);
      setInfo(data);
      setShowUrl(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "링크 재생성 실패");
    } finally {
      setLoading(false);
    }
  };

  const body =
    loading && !info ? (
      <p className="text-sm text-muted">링크 불러오는 중…</p>
    ) : info ? (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {shareSupported && (
            <Button size="sm" onClick={shareLink} disabled={!fullUrl || loading}>
              <Share2 className="h-3.5 w-3.5" />
              공유하기
            </Button>
          )}
          <Button
            size="sm"
            variant={shareSupported ? "secondary" : "primary"}
            onClick={copyLink}
            disabled={!fullUrl || loading}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "복사됨" : "링크 복사"}
          </Button>
          <Button size="sm" variant="ghost" onClick={regenerate} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> 링크 재생성
          </Button>
        </div>

        <p className="text-xs text-muted">
          만료: {new Date(info.expires_at).toLocaleDateString("ko-KR")}
        </p>

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          onClick={() => setShowUrl((v) => !v)}
        >
          {showUrl ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> 링크 주소 숨기기
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> 링크 주소 보기
            </>
          )}
        </button>

        {showUrl && (
          <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs break-all text-foreground">
            {fullUrl}
          </div>
        )}
      </div>
    ) : (
      <p className="text-sm text-muted">초대 링크를 불러오지 못했습니다.</p>
    );

  if (embedded) {
    return (
      <div>
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="h-4 w-4 text-primary" /> URL 초대
        </p>
        <p className="mb-3 text-xs text-muted">친구에게 보낼 초대 링크입니다.</p>
        {body}
      </div>
    );
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardTitle className="flex items-center gap-2 text-base">
        <Link2 className="h-4 w-4 text-primary" /> URL 초대
      </CardTitle>
      <CardDescription className="mt-1">친구에게 보낼 초대 링크입니다.</CardDescription>
      <div className="mt-4">{body}</div>
    </Card>
  );
}
