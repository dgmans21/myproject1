"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type SiteVisitEvent, type Profile } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";

const BROWSER_OPTIONS = ["", "Chrome", "Firefox", "Safari", "Edge", "Opera", "Other"];

export default function AdminVisitsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<SiteVisitEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [browser, setBrowser] = useState("");
  const [path, setPath] = useState("");
  const [ip, setIp] = useState("");

  useEffect(() => {
    api.profiles
      .me()
      .then((p) => {
        setProfile(p);
        if (!isAdmin(p)) router.replace("/dashboard");
      })
      .catch(() => router.replace("/"));
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.analytics.listVisits({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        browser: browser || undefined,
        path: path || undefined,
        ip: ip || undefined,
        limit: 50,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, browser, path, ip]);

  useEffect(() => {
    if (profile && isAdmin(profile)) load();
  }, [profile, load]);

  if (!profile || !isAdmin(profile)) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 text-center text-muted">확인 중…</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="mb-6 text-sm text-muted">
          User-Agent · IP(해시/마스킹) 기준 조회 · 관리자 전용
        </p>

        <Card className="mt-6">
          <CardTitle className="text-base">검색</CardTitle>
          <CardDescription className="mt-1">
            IP는 입력값을 해시해 일치하는 로그만 표시합니다 (원문 IP는 DB에 저장하지 않음)
          </CardDescription>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="시작일"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="종료일"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div>
              <label htmlFor="browser" className="mb-1.5 block text-sm font-medium text-foreground">
                브라우저
              </label>
              <select
                id="browser"
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
              >
                {BROWSER_OPTIONS.map((b) => (
                  <option key={b || "all"} value={b}>
                    {b || "전체"}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="경로 포함"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/dashboard"
            />
            <Input
              label="IP 조회"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="203.0.113.1"
            />
          </div>
          <Button className="mt-4" size="sm" onClick={load} disabled={loading}>
            {loading ? "조회 중…" : "조회"}
          </Button>
        </Card>

        <p className="mt-4 text-sm text-muted">
          총 <strong className="text-foreground">{total.toLocaleString("ko-KR")}</strong>건
        </p>

        <div className="mt-4 space-y-3">
          {items.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {new Date(row.visited_at).toLocaleString("ko-KR")}
                </p>
                <p className="text-xs text-muted">
                  {row.browser_family} · {row.os_family}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted">
                경로 <span className="text-foreground">{row.path}</span>
                {row.display_name && (
                  <>
                    {" "}
                    · <span className="text-foreground">{row.display_name}</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">
                IP {row.ip_masked ?? "—"} · hash{" "}
                <code className="text-foreground">{row.ip_hash.slice(0, 12)}…</code>
              </p>
              {row.user_agent && (
                <p className="mt-2 break-all text-xs text-muted" title={row.user_agent}>
                  UA {row.user_agent}
                </p>
              )}
            </Card>
          ))}
          {!loading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">조회 결과가 없습니다</p>
          )}
        </div>
    </div>
  );
}
