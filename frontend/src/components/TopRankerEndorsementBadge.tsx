import { Trophy } from "lucide-react";
import {
  formatTopRankerEndorsement,
  type TopRankerPlaceEndorsement,
} from "@/lib/top-ranker-endorsement";
import { cn } from "@/lib/utils";

interface TopRankerEndorsementBadgeProps {
  endorsement: TopRankerPlaceEndorsement;
  className?: string;
}

export function TopRankerEndorsementBadge({
  endorsement,
  className,
}: TopRankerEndorsementBadgeProps) {
  return (
    <p
      className={cn(
        "mt-2 flex items-start gap-2 rounded-lg border border-warm/35 bg-gradient-to-r from-warm/10 to-amber-500/5 px-3 py-2 text-xs leading-relaxed text-foreground",
        className
      )}
    >
      <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm" aria-hidden />
      <span>
        <strong className="font-semibold text-warm">
          {endorsement.rank}위 {endorsement.display_name}
        </strong>
        님이 추천한 맛집입니다
      </span>
      <span className="sr-only">{formatTopRankerEndorsement(endorsement)}</span>
    </p>
  );
}
