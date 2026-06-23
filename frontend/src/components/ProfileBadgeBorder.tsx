import { cn } from "@/lib/utils";

/** CSS만으로 금속·광택 느낌 (애니메이션 없음) */
const KOREAN_MICHELIN_BORDER =
  "relative overflow-hidden ring-2 ring-amber-300/80 " +
  "shadow-[0_0_18px_rgba(251,191,36,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] " +
  "bg-gradient-to-br from-amber-50/60 via-white/30 to-yellow-100/50 " +
  "before:pointer-events-none before:absolute before:inset-0 " +
  "before:bg-gradient-to-tr before:from-white/55 before:via-transparent before:to-amber-200/25";

const MASTER_BORDER =
  "relative overflow-hidden ring-2 ring-blue-500/70 " +
  "shadow-[0_0_14px_rgba(59,130,246,0.28),inset_0_1px_0_rgba(255,255,255,0.6)] " +
  "bg-gradient-to-br from-blue-50/50 via-white/20 to-indigo-50/40";

const GRANDMASTER_BORDER =
  "relative overflow-hidden ring-2 ring-amber-500/75 " +
  "shadow-[0_0_16px_rgba(234,88,12,0.3),inset_0_1px_0_rgba(255,255,255,0.55)] " +
  "bg-gradient-to-br from-orange-50/50 via-white/20 to-amber-100/40";

const BORDER_STYLES: Record<string, string> = {
  none: "",
  bronze: "ring-2 ring-amber-600/40 shadow-sm shadow-amber-600/10",
  silver: "ring-2 ring-slate-400/50 shadow-sm shadow-slate-400/15",
  gold: "ring-2 ring-yellow-500/50 shadow-md shadow-yellow-500/20",
  platinum: "ring-2 ring-blue-500/60 shadow-md shadow-blue-500/30",
  emerald: "ring-2 ring-emerald-500/55 shadow-md shadow-emerald-500/25",
  diamond: "ring-2 ring-cyan-300/75 shadow-lg shadow-cyan-400/40",
  master: MASTER_BORDER,
  grandmaster: GRANDMASTER_BORDER,
  supreme: KOREAN_MICHELIN_BORDER,
  korean_michelin: KOREAN_MICHELIN_BORDER,
};

type SparkleVariant = "master" | "grandmaster" | "supreme";

const SPARKLE_BADGE_STYLES: Record<
  SparkleVariant,
  { shell: string; highlight: string; text: string }
> = {
  master: {
    shell:
      "border border-blue-400/70 " +
      "bg-gradient-to-br from-[#2563EB] via-[#1E40AF] to-[#1E3A8A] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_4px_rgba(30,64,175,0.5),0_0_12px_rgba(59,130,246,0.35)]",
    highlight: "from-white/50 via-blue-100/20 to-transparent",
    text: "text-white",
  },
  grandmaster: {
    shell:
      "border border-amber-500/80 " +
      "bg-gradient-to-br from-[#EA580C] via-[#B45309] to-[#92400E] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_4px_rgba(180,83,9,0.55),0_0_12px_rgba(251,146,60,0.35)]",
    highlight: "from-white/55 via-amber-100/25 to-transparent",
    text: "text-white",
  },
  supreme: {
    shell:
      "border border-yellow-300/90 " +
      "bg-gradient-to-br from-[#FFF9E6] via-[#FFE566] to-[#F5C542] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_4px_rgba(251,191,36,0.45),0_0_10px_rgba(255,215,0,0.3)]",
    highlight: "from-white/70 via-white/15 to-transparent",
    text: "text-amber-950",
  },
};

function resolveBorderKey(borderStyle?: string, badgeTier?: string): string {
  const style = borderStyle?.toLowerCase();
  if (style && BORDER_STYLES[style]) return style;
  const tier = badgeTier?.toLowerCase();
  if (tier === "supreme" || tier === "korean_michelin") return "supreme";
  if (tier === "grandmaster") return "grandmaster";
  if (tier === "master") return "master";
  return tier ?? style ?? "none";
}

function resolveSparkleVariant(title: string, badgeColor?: string): SparkleVariant | null {
  const color = badgeColor?.toUpperCase();
  if (title === "명예 미슐랭 가이드" || title === "방구석 미슐랭" || color === "#FFD54F") return "supreme";
  if (title.includes("그랜드마스터") || color === "#B45309") return "grandmaster";
  if (title.includes("마스터 한국의") || color === "#1E40AF") return "master";
  return null;
}

interface ProfileBadgeBorderProps {
  borderStyle?: string;
  badgeTier?: string;
  children: React.ReactNode;
  className?: string;
}

export function ProfileBadgeBorder({
  borderStyle = "none",
  badgeTier,
  children,
  className,
}: ProfileBadgeBorderProps) {
  const key = resolveBorderKey(borderStyle, badgeTier);
  const ringClass = BORDER_STYLES[key] ?? "";

  return (
    <div className={cn("rounded-2xl", ringClass, className)}>
      {children}
    </div>
  );
}

interface TrustBadgeProps {
  title: string;
  badgeColor?: string;
  className?: string;
}

function SparkleTrustBadge({
  title,
  variant,
  className,
}: {
  title: string;
  variant: SparkleVariant;
  className?: string;
}) {
  const style = SPARKLE_BADGE_STYLES[variant];

  return (
    <span
      className={cn(
        "relative inline-flex items-center overflow-hidden rounded-full px-2.5 py-0.5 text-xs font-bold",
        style.shell,
        style.text,
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-tr",
          style.highlight
        )}
        aria-hidden
      />
      <span className="relative">{title}</span>
    </span>
  );
}

export function TrustBadge({ title, badgeColor = "#94A3B8", className }: TrustBadgeProps) {
  const sparkle = resolveSparkleVariant(title, badgeColor);

  if (sparkle) {
    return <SparkleTrustBadge title={title} variant={sparkle} className={className} />;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white",
        className
      )}
      style={{ backgroundColor: badgeColor }}
    >
      {title}
    </span>
  );
}
