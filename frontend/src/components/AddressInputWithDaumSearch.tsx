"use client";

import { useState } from "react";
import { DaumPostcodeModal } from "@/components/DaumPostcodeModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";

type AddressInputMode = "search" | "manual";

export function AddressInputWithDaumSearch({
  label,
  value,
  onChange,
  placeholder = "주소를 검색하거나 직접 입력하세요",
  manualPlaceholder = "서울 강남구 …",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  manualPlaceholder?: string;
}) {
  const [mode, setMode] = useState<AddressInputMode>("search");
  const [modalOpen, setModalOpen] = useState(false);

  const openSearch = () => setModalOpen(true);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "search"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          주소 검색
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          직접 입력
        </button>
      </div>

      {mode === "search" ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={openSearch}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground min-h-[42px] hover:border-primary/40"
          >
            {value ? (
              <span>{value}</span>
            ) : (
              <span className="text-muted/60">{placeholder}</span>
            )}
          </button>
          <Button type="button" size="sm" variant="secondary" onClick={openSearch}>
            <Search className="h-3.5 w-3.5" />
            다음 주소 검색
          </Button>
          {value ? (
            <p className="text-xs text-muted">
              주소를 눌러 다시 검색할 수 있습니다. 동·호수는 직접 입력 탭에서 수정하세요.
            </p>
          ) : null}
        </div>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={manualPlaceholder}
        />
      )}

      <DaumPostcodeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={onChange}
        title="주소 검색"
      />
    </div>
  );
}
