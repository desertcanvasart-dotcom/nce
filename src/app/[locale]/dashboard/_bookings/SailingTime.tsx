import { ui } from "@/components/dashboard/ui";
import { arriveDayBefore, dayBeforeTip, sailingTimeText, type SailingPeriod } from "@/lib/product/sailing-time";

/** PROPOSED-019: when the ship sails on the first day, and for a morning sailing, the tip to arrive the day before. */
export function SailingTime({
  schedule,
}: {
  schedule: { origin: string; sailing_period: SailingPeriod | null; sails_at: string | null } | null | undefined;
}) {
  if (!schedule?.sailing_period) return null;
  return (
    <>
      <p>{sailingTimeText(schedule.sailing_period, schedule.sails_at, schedule.origin)}.</p>
      {arriveDayBefore(schedule.sailing_period) ? <p className={ui.muted}>{dayBeforeTip(schedule.origin)}</p> : null}
    </>
  );
}
