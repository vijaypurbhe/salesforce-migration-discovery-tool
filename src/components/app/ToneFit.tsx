import { FIT_STATUSES } from "@/lib/models";
import { Pill, type Tone } from "./bits";
export function FitPill({ v }: { v: string }) {
  const f = FIT_STATUSES.find((x) => x.value === v);
  return <Pill tone={(f?.tone as Tone) ?? "muted"}>{f?.label ?? v}</Pill>;
}
