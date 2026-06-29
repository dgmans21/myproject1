import { cn } from "@/lib/utils";

interface SampleDataBadgeProps {
  className?: string;
  compact?: boolean;
}

/** 예시(mock) 데이터임을 표시 */
export function SampleDataBadge({ className, compact }: SampleDataBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 font-medium text-amber-700 dark:text-amber-400",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
      title="예시 데이터입니다. 실제 정보가 아닙니다."
    >
      {compact ? "예시" : "예시 데이터"}
    </span>
  );
}
