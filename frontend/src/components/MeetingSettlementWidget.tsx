import { Card, CardTitle } from "@/components/ui/Card";
import type { MeetingSettlement } from "@/lib/api";

interface MeetingSettlementWidgetProps {
  settlement: MeetingSettlement | null;
}

export function MeetingSettlementWidget({ settlement }: MeetingSettlementWidgetProps) {
  if (!settlement) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardTitle className="text-base">모임 결산</CardTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-card p-4 border border-border">
          <p className="text-xs text-muted">센스킹 👑</p>
          <p className="mt-1 font-semibold text-foreground">
            {settlement.sense_king_name ?? "—"}
          </p>
          <p className="text-xs text-muted mt-1">
            채택 장소 {settlement.sense_king_adopted_count}회
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 border border-border">
          <p className="text-xs text-muted">프로 여정러 🧭</p>
          <p className="mt-1 font-semibold text-foreground">
            {settlement.pro_traveler_name ?? "—"}
          </p>
          {settlement.pro_travel_duration_minutes != null && (
            <p className="text-xs text-muted mt-1">
              약 {settlement.pro_travel_duration_minutes}분 ·{" "}
              {((settlement.pro_travel_distance_meters ?? 0) / 1000).toFixed(1)}km
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
