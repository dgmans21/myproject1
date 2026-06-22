import { cn } from "@/lib/utils";

const BORDER_STYLES: Record<string, string> = {
  none: "",
  bronze: "ring-2 ring-amber-600/40 shadow-sm shadow-amber-600/10",
  silver: "ring-2 ring-slate-400/50 shadow-sm shadow-slate-400/15",
  gold: "ring-2 ring-yellow-500/50 shadow-md shadow-yellow-500/20",
  platinum: "ring-2 ring-fuchsia-400/60 shadow-lg shadow-fuchsia-400/25",
};

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
  const tierKey = badgeTier?.toLowerCase() ?? borderStyle;
  const ringClass = BORDER_STYLES[tierKey] ?? BORDER_STYLES[borderStyle] ?? "";

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

export function TrustBadge({ title, badgeColor = "#94A3B8", className }: TrustBadgeProps) {
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
