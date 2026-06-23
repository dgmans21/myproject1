import { cn } from "@/lib/utils";
import { mbtiStyle } from "@/lib/mbti";

interface MbtiBadgeProps {
  type: string;
  className?: string;
}

export function MbtiBadge({ type, className }: MbtiBadgeProps) {
  const style = mbtiStyle(type);
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className
      )}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {type}
    </span>
  );
}
