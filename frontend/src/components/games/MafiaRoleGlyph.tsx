"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Crosshair,
  Eye,
  HeartPulse,
  Shield,
  Sword,
  User,
} from "lucide-react";
import {
  MAFIA_ACTION_IMAGE,
  MAFIA_ROLE_IMAGE,
  mafiaActionFromNightKey,
  mafiaRoleFromLabel,
  mafiaRoleTone,
  type MafiaActionId,
  type MafiaRoleId,
} from "@/lib/games/mafia-roles";

export const MAFIA_ROLE_ICONS: Record<MafiaRoleId | "bot", LucideIcon> = {
  citizen: User,
  mafia: Crosshair,
  spy: Eye,
  doctor: HeartPulse,
  police: Shield,
  vigilante: Sword,
  bot: Bot,
};

function GlyphImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={64}
      height={64}
      className={`${className} shrink-0 rounded-full bg-white object-contain ring-1 ring-black/5`}
      unoptimized
    />
  );
}

export function MafiaRoleGlyph({
  role,
  className = "h-5 w-5",
}: {
  role?: string | null;
  className?: string;
}) {
  const tone = role === "bot" ? mafiaRoleTone(null) : mafiaRoleTone(role);
  if (role && role in MAFIA_ROLE_IMAGE) {
    return (
      <GlyphImg
        src={MAFIA_ROLE_IMAGE[role as MafiaRoleId]}
        alt={role}
        className={className}
      />
    );
  }
  const id = (role === "bot" ? "bot" : role) as MafiaRoleId | "bot" | null;
  const Icon = (id && MAFIA_ROLE_ICONS[id]) || User;
  return <Icon className={`${className} shrink-0 ${tone.text}`} aria-hidden />;
}

export function MafiaActionGlyph({
  action,
  className = "h-5 w-5",
}: {
  action?: MafiaActionId | null;
  className?: string;
}) {
  if (!action || !MAFIA_ACTION_IMAGE[action]) return null;
  return (
    <GlyphImg src={MAFIA_ACTION_IMAGE[action]} alt={action} className={className} />
  );
}

/** Touch-friendly role/action chip — 2-col grids stay readable on narrow phones. */
export function MafiaRoleChip({
  role,
  label,
  selected,
  onClick,
  disabled,
  step,
  nightKey,
}: {
  role?: string | null;
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  step?: number;
  /** When set, prefer action icon (kill/heal/…) over role portrait. */
  nightKey?: string;
}) {
  const tone = role === "bot" ? mafiaRoleTone(null) : mafiaRoleTone(role);
  const resolved = role === "bot" ? "bot" : role || mafiaRoleFromLabel(label);
  const action = nightKey ? mafiaActionFromNightKey(nightKey) : null;
  const mafiaFirst = role === "mafia" || nightKey === "mafia_kill";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
        selected ? `${tone.soft} ${tone.border} ring-2 ring-current/30` : "border-border bg-card/60",
        mafiaFirst && !selected ? `${tone.border} ${tone.soft}` : "",
        disabled ? "opacity-50" : "active:scale-[0.98]",
      ].join(" ")}
    >
      {typeof step === "number" && (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
            selected || mafiaFirst ? `${tone.soft} ${tone.text}` : "bg-surface text-muted"
          }`}
        >
          {step}
        </span>
      )}
      {action ? (
        <MafiaActionGlyph action={action} className="h-8 w-8" />
      ) : (
        <MafiaRoleGlyph role={resolved} className="h-8 w-8" />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-sm font-medium ${selected || mafiaFirst ? tone.text : "text-foreground"}`}
      >
        {label}
      </span>
    </button>
  );
}
