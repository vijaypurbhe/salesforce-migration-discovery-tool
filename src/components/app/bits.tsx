import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "default" | "info" | "success" | "warning" | "destructive" | "teal" | "muted" | "demo" | "outline" | "navy";
const toneCls: Record<Tone, string> = {
  default: "bg-secondary text-secondary-foreground",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  destructive: "bg-destructive-soft text-destructive",
  teal: "bg-teal-soft text-teal-soft-foreground",
  muted: "bg-muted text-muted-foreground",
  demo: "bg-demo-soft text-demo",
  outline: "border text-muted-foreground",
  navy: "bg-primary text-primary-foreground",
};
export function Pill({ tone = "default", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return <span title={title} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", toneCls[tone], className)}>{children}</span>;
}

export function PageHeader({ kicker, title, description, actions }: { kicker?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="text-2xl font-bold mt-1">{title}</h1>
        {description && <div className="text-sm text-muted-foreground mt-1 max-w-3xl">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <h3 className="font-semibold">{title}</h3>
      {children && <div className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "warning" | "destructive" | "success" }) {
  return (
    <div className="card-elevated p-4">
      <div className="kicker">{label}</div>
      <div className={cn("text-2xl font-display font-bold mt-1", tone === "warning" && "text-warning", tone === "destructive" && "text-destructive", tone === "success" && "text-success")}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export const DemoBadge = () => <Pill tone="demo" title="Synthetic demonstration data">DEMO · synthetic</Pill>;

export const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? "N/A" : `${v}%`);
export const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
