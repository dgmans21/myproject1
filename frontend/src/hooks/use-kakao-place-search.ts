"use client";

import { useCallback, useState } from "react";
import { KakaoPoiResult, keywordSearch } from "@/lib/kakao-map";

const EMPTY_RESULTS: KakaoPoiResult[] = [];

export function useKakaoPlaceSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPoiResult[]>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const search = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const page = await keywordSearch(q);
      setResults(page.pois);
      setSelectedPoiId(null);
      if (page.pois.length === 0) {
        setError("검색 결과가 없습니다. 다른 키워드로 시도해 보세요.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "장소 검색에 실패했습니다");
      setResults(EMPTY_RESULTS);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const clear = useCallback(() => {
    setQuery("");
    setResults(EMPTY_RESULTS);
    setError(null);
    setSelectedPoiId(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    selectedPoiId,
    setSelectedPoiId,
    search,
    clear,
  };
}
