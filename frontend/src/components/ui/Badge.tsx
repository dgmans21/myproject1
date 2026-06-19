import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "accent" | "warm" | "tier";
  tier?: string;
  className?: string;
}

export function Badge({ children, variant = "default", tier, className }: BadgeProps) {
  const tierClass = tier ? `tier-${tier}` : "";
  const variants = {
    default: "bg-surface text-muted",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    warm: "bg-orange-100 text-orange-600",
    tier: tierClass,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
