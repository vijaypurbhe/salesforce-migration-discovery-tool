import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { AnswerRow, AnswerState, QuestionDefinition } from "@/domain/types";
import type { Applicability } from "@/domain/branching";
import { AnswerControl } from "./AnswerControl";
import { ActionBar } from "./QuestionActions";
import { draftFromRow, type Draft, type SaveStatus } from "@/hooks/useAnswerSaver";
import { Pill } from "@/components/app/bits";
import { useAssessment } from "@/context/AssessmentContext";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

const STATES: { v: AnswerState; label: string; hint: string }[] = [
  { v: "known", label: "Known", hint: "Provide the answer" },
  { v: "unknown", label: "Unknown", hint: "Becomes a follow-up item — never treated as zero or No" },
  { v: "needs_validation", label: "Needs validation", hint: "Tentative answer that must be confirmed" },
  { v: "not_applicable", label: "Not applicable", hint: "Requires a short reason" },
];

export function SaveIndicator({ s }: { s?: SaveStatus }) {
  if (!s || s.kind === "idle") return null;
  if (s.kind === "dirty") return <span className="text-xs text-muted-foreground">Unsaved changes…</span>;
  if (s.kind === "saving") return <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving</span>;
  if (s.kind === "saved") return <span className="text-xs text-success inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Saved at {s.at}</span>;
  if (s.kind === "conflict") return <span className="text-xs text-warning inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Edit conflict</span>;
  return <span className="text-xs text-destructive inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{s.kind === "invalid" ? s.error : `Save failed: ${s.error}`}</span>;
}

interface Props {
  q: QuestionDefinition; row?: AnswerRow; draft?: Draft; status?: SaveStatus; applicability: Applicability;
  hasEvidence: boolean; onDraft: (d: Draft) => void; onRetry: () => void; compact?: boolean;
}

export function QuestionCard({ q, row, draft, status, applicability, hasEvidence, onDraft, onRetry }: Props) {
  const { me, assessment } = useAssessment();
  const qc = useQueryClient();
  const d = draft ?? draftFromRow(row);
  const [showTech, setShowTech] = useState(false);
  const disabled = !me.canAnswer(q.id);
  const set = (p: Partial<Draft>) => onDraft({ ...d, ...p });
  const review = async (s: string) => {
    if (!row) return;
    const { error } = await db.rpc("set_answer_review", { p_answer: row.id, p_status: s });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["answers", assessment.id] });
  };
  const answered = row?.state === "known" ? "Answered" : row?.state === "unknown" ? "Unknown" : row?.state === "needs_validation" ? "Needs validation" : row?.state === "not_applicable" ? "N/A" : "Not answered";

  return (
    <article id={`q-${q.id}`} aria-labelledby={`ql-${q.id}`} className={cn("card-elevated p-5 scroll-mt-24", applicability === "hidden" && "opacity-70")}>
      <header className="flex flex-wrap items-start gap-2">
        <span className="font-mono text-xs rounded bg-secondary px-1.5 py-0.5 mt-0.5">{q.id}</span>
        <h3 id={`ql-${q.id}`} className="font-display font-semibold text-base flex-1 min-w-[240px]">{q.label}</h3>
        <SaveIndicator s={status} />
        {status?.kind === "failed" && <Button size="sm" variant="outline" onClick={onRetry}><RefreshCw className="h-3.5 w-3.5 mr-1" />Retry</Button>}
      </header>
      <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Status badges">
        {applicability === "unresolved" && <Pill tone="warning" title="A controlling answer is unknown">Scope unresolved</Pill>}
        {applicability === "hidden" && <Pill tone="muted">Inactive — answer preserved</Pill>}
        {applicability === "bulk_na" && <Pill tone="muted">Module N/A</Pill>}
        <Pill tone={row?.state === "known" ? "success" : row?.state ? "warning" : "outline"}>{answered}</Pill>
        {q.evidenceRequired && <Pill tone={hasEvidence ? "success" : "outline"}>{hasEvidence ? "Evidence attached" : "Evidence required"}</Pill>}
        {row && <Pill tone={row.review_status === "reviewed" ? "teal" : row.review_status === "disputed" ? "destructive" : "muted"}>{row.review_status === "reviewed" ? <><ShieldCheck className="h-3 w-3" />Reviewed</> : row.review_status}</Pill>}
        {row?.needs_revalidation && <Pill tone="warning">Needs revalidation</Pill>}
        {q.criticality === "gate" && <Pill tone="navy">Routing</Pill>}
        {!q.customerVisible && <Pill tone="warning">Internal only</Pill>}
        <Pill tone="outline">Owner: {q.defaultOwnerRole}</Pill>
      </div>
      <p className="text-sm text-muted-foreground mt-3">{q.help.split(". ")[0]}.</p>
      <Collapsible open={showTech} onOpenChange={setShowTech}>
        <CollapsibleTrigger className="text-xs text-teal font-medium mt-1 inline-flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />Technical details, why this matters & example<ChevronDown className={cn("h-3 w-3 transition-transform", showTech && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-lg bg-secondary/60 p-3 text-sm space-y-1.5">
          <p><span className="font-semibold">Detail: </span>{q.detail}</p>
          <p><span className="font-semibold">Why this matters: </span>{q.whyItMatters}</p>
          <p><span className="font-semibold">Example: </span>{q.example}</p>
        </CollapsibleContent>
      </Collapsible>

      <div role="radiogroup" aria-label={`Answer state for ${q.id}`} className="flex flex-wrap gap-1.5 mt-4">
        {STATES.map((s) => (
          <button key={s.v} type="button" role="radio" aria-checked={d.state === s.v} disabled={disabled} title={s.hint}
            onClick={() => set({ state: s.v })}
            className={cn("rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60", d.state === s.v ? (s.v === "known" ? "bg-primary text-primary-foreground border-primary" : "bg-warning-soft border-warning text-warning-foreground") : "hover:bg-secondary")}>
            {s.label}
          </button>
        ))}
      </div>

      {(d.state === "known" || d.state === "needs_validation") && (
        <div className="mt-4"><AnswerControl q={q} value={d.value} onChange={(v) => set({ value: v })} disabled={disabled} /></div>
      )}
      {d.state === "unknown" && <p className="mt-3 text-sm rounded-lg bg-warning-soft text-warning-foreground p-3">Recorded as a follow-up. Unknown never counts as zero, “No” or low complexity. Use “Assign to SME” or “Ask later” to route it.</p>}
      {d.state === "not_applicable" && (
        <div className="mt-3 max-w-xl"><Label htmlFor={`na-${q.id}`}>Reason this does not apply (required)</Label>
          <Input id={`na-${q.id}`} disabled={disabled} value={d.na_reason} onChange={(e) => set({ na_reason: e.target.value })} aria-invalid={!d.na_reason.trim()} /></div>
      )}

      {d.state && d.state !== "unknown" && (
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <div><Label className="text-xs">Confidence</Label>
            <Select disabled={disabled} value={d.confidence} onValueChange={(v) => set({ confidence: v as Draft["confidence"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="self_reported">Self-reported</SelectItem><SelectItem value="documented">Documented</SelectItem><SelectItem value="tested">Tested</SelectItem></SelectContent>
            </Select></div>
          <div><Label className="text-xs" htmlFor={`own-${q.id}`}>Answer owner</Label><Input id={`own-${q.id}`} disabled={disabled} value={d.owner_label} onChange={(e) => set({ owner_label: e.target.value })} placeholder={q.defaultOwnerRole} /></div>
          <div><Label className="text-xs" htmlFor={`due-${q.id}`}>Due date</Label><Input id={`due-${q.id}`} disabled={disabled} type="date" value={d.due_date} onChange={(e) => set({ due_date: e.target.value })} /></div>
        </div>
      )}
      {d.state && (
        <details className="mt-3"><summary className="text-xs font-medium cursor-pointer text-muted-foreground">Notes {d.notes ? "(1)" : ""}</summary>
          <Textarea aria-label={`Notes for ${q.id}`} disabled={disabled} className="mt-2" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Explanation, context or caveats" /></details>
      )}
      {disabled && !me.readOnly && <p className="text-xs text-muted-foreground mt-3">This module is not assigned to you — read-only.</p>}

      <footer className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
        <ActionBar questionId={q.id} answerId={row?.id} />
        {me.canEditInternal && row && (
          <div className="flex gap-1">
            <Button size="sm" variant={row.review_status === "reviewed" ? "secondary" : "outline"} onClick={() => review("reviewed")}>Mark reviewed</Button>
            <Button size="sm" variant="ghost" onClick={() => review("disputed")}>Dispute</Button>
          </div>
        )}
      </footer>
    </article>
  );
}
