import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAssessment } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { MODULES, QUESTIONS, QUESTION_BY_ID, QUICK_START_IDS, questionsForModule } from "@/domain/questionBank";
import { applicabilityMap, type Applicability } from "@/domain/branching";
import { computeCoverage } from "@/domain/coverage";
import { useAnswerSaver } from "@/hooks/useAnswerSaver";
import { QuestionCard, SaveIndicator } from "@/components/discovery/QuestionCard";
import { ConflictDialog } from "@/components/discovery/ConflictDialog";
import { PageHeader, Pill, fmtPct } from "@/components/app/bits";
import { db, must } from "@/lib/db";
import type { Assignment } from "@/lib/models";
import { cn } from "@/lib/utils";

const STEP = 4;
type View = "quick" | "guided" | "workbench";

export default function Discovery() {
  const { assessment, answers, answerRows, evidencedIds, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as View) || "quick";
  const [live, setLive] = useState("");
  const announce = useCallback((m: string) => setLive(m), []);
  const saver = useAnswerSaver(assessment.id, answers, announce);

  // Merge drafts for routing so branches react while typing
  const effective = useMemo(() => {
    const m = { ...answers };
    for (const [k, d] of Object.entries(saver.drafts)) if (d.state) m[k] = { ...(m[k] ?? { row_version: 0, review_status: "draft" }), state: d.state, value: d.value } as never;
    return m;
  }, [answers, saver.drafts]);
  const appl = useMemo(() => applicabilityMap(effective, assessment.bulk_na), [effective, assessment.bulk_na]);
  const coverage = useMemo(() => computeCoverage(answers, evidencedIds, { bulkNa: assessment.bulk_na }), [answers, evidencedIds, assessment.bulk_na]);
  const qsCoverage = useMemo(() => computeCoverage(answers, evidencedIds, { ids: QUICK_START_IDS }), [answers, evidencedIds]);
  const anyPending = Object.values(saver.status).some((s) => s.kind === "dirty" || s.kind === "saving");
  const anyFailed = Object.values(saver.status).some((s) => s.kind === "failed");

  const setView = async (v: string) => { await saver.flushAll(); params.set("view", v); params.delete("q"); setParams(params, { replace: true }); };

  const persistPosition = useCallback((qid: string) => {
    db.from("user_assessment_state").upsert({ user_id: user!.id, assessment_id: assessment.id, last_question_id: qid, last_view: view, updated_at: new Date().toISOString() }).then(() => undefined);
  }, [user, assessment.id, view]);

  const card = (id: string) => {
    const q = QUESTION_BY_ID[id];
    return (
      <QuestionCard key={id} q={q} row={answerRows.find((r) => r.question_id === id && r.instance_key === "")} draft={saver.drafts[id]} status={saver.status[id]}
        applicability={appl[id]} hasEvidence={evidencedIds.has(id)} onDraft={(d) => saver.setDraft(id, d)} onRetry={() => saver.save(id)} />
    );
  };

  return (
    <div>
      <div aria-live="polite" className="sr-only">{live}</div>
      <PageHeader kicker="Discovery" title="Guided discovery"
        description="Three views over the same answers. Nothing is preselected; Unknown and Not applicable are explicit answer states."
        actions={<div className="flex items-center gap-3">
          {anyPending ? <span className="text-xs text-muted-foreground">Saving…</span> : anyFailed ? <span className="text-xs text-destructive">Some answers are unsaved drafts</span> : <span className="text-xs text-success">All changes saved to the server</span>}
          <Button variant="outline" size="sm" onClick={async () => { await saver.flushAll(); toast.success("Saved. You can resume on any device."); }}>Save & exit point</Button>
        </div>} />
      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <div className="card-elevated p-3"><div className="kicker">Answer coverage</div><div className="font-display text-xl font-bold">{fmtPct(coverage.answerPct)}</div><div className="text-xs text-muted-foreground">{coverage.answered}/{coverage.applicable} applicable · {coverage.answeredUnknown} unknown/needs validation</div></div>
        <div className="card-elevated p-3"><div className="kicker">Review coverage</div><div className="font-display text-xl font-bold">{fmtPct(coverage.reviewPct)}</div><div className="text-xs text-muted-foreground">{coverage.reviewed} architect-reviewed</div></div>
        <div className="card-elevated p-3"><div className="kicker">Evidence coverage</div><div className="font-display text-xl font-bold">{fmtPct(coverage.evidencePct)}</div><div className="text-xs text-muted-foreground">{coverage.evidenced}/{coverage.evidenceRequired} evidence-required</div></div>
        <div className="card-elevated p-3"><div className="kicker">Routing unresolved</div><div className={cn("font-display text-xl font-bold", coverage.routingUnresolved && "text-warning")}>{coverage.routingUnresolved}</div><div className="text-xs text-muted-foreground">applicability not yet determined</div></div>
      </div>
      <Tabs value={view} onValueChange={setView} className="mb-5">
        <TabsList><TabsTrigger value="quick">Quick start ({qsCoverage.answered + qsCoverage.answeredUnknown}/20)</TabsTrigger><TabsTrigger value="guided">Guided discovery</TabsTrigger><TabsTrigger value="workbench">Architect workbench</TabsTrigger></TabsList>
      </Tabs>
      {view === "quick" && <QuickStart card={card} onStep={async (id) => { await saver.flushAll(); persistPosition(id); }} start={params.get("q")} />}
      {view === "guided" && <Guided card={card} appl={appl} onStep={async (id) => { await saver.flushAll(); persistPosition(id); }} start={params.get("q")} />}
      {view === "workbench" && <Workbench card={card} appl={appl} />}
      <ConflictDialog conflict={saver.conflict} onResolve={(c) => saver.resolveConflict(c)} />
    </div>
  );
}

function QuickStart({ card, onStep, start }: { card: (id: string) => JSX.Element; onStep: (id: string) => Promise<void>; start: string | null }) {
  const { answers } = useAssessment();
  const initial = Math.max(0, start ? QUICK_START_IDS.indexOf(start) : QUICK_START_IDS.findIndex((id) => !answers[id]));
  const [i, setI] = useState(initial === -1 ? 0 : initial);
  const go = async (n: number) => { const j = Math.min(Math.max(0, n), QUICK_START_IDS.length - 1); await onStep(QUICK_START_IDS[j]); setI(j); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-3"><span className="text-sm font-medium">Question {i + 1} of 20</span><Progress value={((i + 1) / 20) * 100} className="flex-1" aria-label="Quick start progress" /></div>
      <div className="flex flex-wrap gap-1 mb-4" role="list" aria-label="Quick-start questions">
        {QUICK_START_IDS.map((id, j) => (
          <button key={id} role="listitem" onClick={() => go(j)} aria-current={i === j} className={cn("font-mono text-[11px] rounded px-1.5 py-0.5 border", i === j ? "bg-primary text-primary-foreground" : answers[id] ? answers[id].state === "known" ? "bg-success-soft text-success border-transparent" : "bg-warning-soft border-transparent" : "")}>{id}</button>
        ))}
      </div>
      {card(QUICK_START_IDS[i])}
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={() => go(i - 1)} disabled={i === 0}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
        <Button onClick={() => go(i + 1)} disabled={i === QUICK_START_IDS.length - 1}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  );
}

function moduleBadge(code: string, appl: Record<string, Applicability>) {
  const ids = questionsForModule(code).map((q) => q.id);
  if (ids.every((id) => appl[id] === "bulk_na")) return <Pill tone="muted">N/A</Pill>;
  if (ids.some((id) => appl[id] === "unresolved")) return <Pill tone="warning">Scope unresolved</Pill>;
  if (ids.every((id) => appl[id] === "hidden")) return <Pill tone="muted">Not applicable by routing</Pill>;
  return null;
}

function Guided({ card, appl, onStep, start }: { card: (id: string) => JSX.Element; appl: Record<string, Applicability>; onStep: (id: string) => Promise<void>; start: string | null }) {
  const { answers, assessment, me } = useAssessment();
  const startMod = start ? QUESTION_BY_ID[start]?.module : "B";
  const [mod, setMod] = useState(startMod ?? "B");
  const visible = questionsForModule(mod).filter((q) => appl[q.id] !== "hidden");
  const hidden = questionsForModule(mod).filter((q) => appl[q.id] === "hidden");
  const startIdx = start ? Math.floor(Math.max(0, visible.findIndex((q) => q.id === start)) / STEP) : 0;
  const [page, setPage] = useState(startIdx);
  const pages = Math.max(1, Math.ceil(visible.length / STEP));
  const ids = visible.slice(page * STEP, page * STEP + STEP).map((q) => q.id);
  const selectMod = async (m: string) => { await onStep(questionsForModule(m)[0].id); setMod(m); setPage(0); };
  const goPage = async (p: number) => { await onStep(visible[Math.min(p * STEP, visible.length - 1)]?.id ?? ids[0]); setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const modCov = (m: string) => computeCoverage(answers, new Set(), { modules: [m], bulkNa: assessment.bulk_na }).answerPct;
  const m = MODULES.find((x) => x.code === mod)!;
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      <nav aria-label="Modules" className="space-y-1 lg:sticky lg:top-20 h-fit">
        {MODULES.map((x) => (
          <button key={x.code} onClick={() => selectMod(x.code)} aria-current={mod === x.code} className={cn("w-full text-left rounded-lg px-3 py-2 text-sm flex items-center gap-2", mod === x.code ? "bg-secondary font-semibold" : "hover:bg-secondary/60")}>
            <span className="font-mono text-xs w-4">{x.code}</span><span className="flex-1 truncate">{x.name}</span><span className="text-xs text-muted-foreground">{fmtPct(modCov(x.code))}</span>
          </button>
        ))}
      </nav>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1"><h2 className="text-xl font-bold">{m.code}. {m.name}</h2>{moduleBadge(mod, appl)}</div>
        <p className="text-sm text-muted-foreground mb-4">Default owner: {m.owner}. Axis: {m.axisText}.</p>
        {me.canEditInternal && <BulkNa module={mod} />}
        {visible.length === 0 ? <p className="text-sm text-muted-foreground rounded-lg border p-4">No questions in this module apply based on current routing answers.</p> : (
          <>
            <div className="text-xs text-muted-foreground mb-2">Step {page + 1} of {pages}</div>
            <div className="space-y-4">{ids.map(card)}</div>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => goPage(page - 1)} disabled={page === 0}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
              <Button onClick={() => goPage(page + 1)} disabled={page >= pages - 1}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </>
        )}
        {hidden.length > 0 && <p className="text-xs text-muted-foreground mt-6">{hidden.length} question(s) hidden by routing: {hidden.map((q) => q.id).join(", ")}. Any saved answers are preserved and will be flagged for revalidation if they become applicable again.</p>}
      </div>
    </div>
  );
}

function BulkNa({ module }: { module: string }) {
  const { assessment, project } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState(assessment.bulk_na?.[module] ?? "");
  const [open, setOpen] = useState(false);
  const active = !!assessment.bulk_na?.[module];
  const apply = async (on: boolean) => {
    if (on && !reason.trim()) return toast.error("A reason is required.");
    const next = { ...(assessment.bulk_na ?? {}) };
    if (on) next[module] = reason.trim(); else delete next[module];
    const { error } = await db.from("assessments").update({ bulk_na: next }).eq("id", assessment.id);
    if (error) return toast.error(error.message);
    await db.from("audit_events").insert({ project_id: project.id, assessment_id: assessment.id, actor: user!.id, action: on ? "module.bulk_na" : "module.bulk_na_removed", object_type: "module", object_id: module, summary: reason });
    qc.invalidateQueries({ queryKey: ["assessment", assessment.id] }); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="mb-4">{active ? "Module marked N/A — change" : "Mark whole module not applicable…"}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Module {module} not applicable</DialogTitle><DialogDescription>Affects: {questionsForModule(module).map((q) => q.id).join(", ")}. Existing answers are preserved.</DialogDescription></DialogHeader>
        <Label htmlFor="bna">Reason (required)</Label><Input id="bna" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>{active && <Button variant="outline" onClick={() => apply(false)}>Remove N/A</Button>}<Button onClick={() => apply(true)}>Apply</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Workbench({ card, appl }: { card: (id: string) => JSX.Element; appl: Record<string, Applicability> }) {
  const { answers, evidencedIds, assessment } = useAssessment();
  const [q, setQ] = useState(""); const [mod, setMod] = useState("all"); const [f, setF] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const assignments = useQuery({ queryKey: ["assignments", assessment.id], queryFn: () => must<Assignment[]>(db.from("assignments").select("*").eq("assessment_id", assessment.id).eq("status", "open")) });
  const assigned = new Set((assignments.data ?? []).map((a) => a.question_id));
  const rows = QUESTIONS.filter((x) => {
    if (mod !== "all" && x.module !== mod) return false;
    const a = answers[x.id];
    if (f === "unknown" && !(a?.state === "unknown" || a?.state === "needs_validation")) return false;
    if (f === "unanswered" && (a || appl[x.id] === "hidden")) return false;
    if (f === "unresolved" && appl[x.id] !== "unresolved") return false;
    if (f === "evidence" && !(x.evidenceRequired && !evidencedIds.has(x.id))) return false;
    if (f === "unreviewed" && !(a && a.review_status !== "reviewed")) return false;
    if (f === "assigned" && !assigned.has(x.id)) return false;
    if (f === "revalidate" && !a?.needs_revalidation) return false;
    const s = q.toLowerCase();
    return !s || x.id.toLowerCase().includes(s) || x.label.toLowerCase().includes(s) || x.detail.toLowerCase().includes(s);
  });
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative"><Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden /><Input aria-label="Search questions" className="pl-8 w-72" placeholder="Search ID, question or detail…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={mod} onValueChange={setMod}><SelectTrigger className="w-56" aria-label="Module"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All modules</SelectItem>{MODULES.map((m) => <SelectItem key={m.code} value={m.code}>{m.code}. {m.name}</SelectItem>)}</SelectContent></Select>
        <Select value={f} onValueChange={setF}><SelectTrigger className="w-60" aria-label="Queue"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All questions</SelectItem><SelectItem value="unknown">Unknowns queue</SelectItem><SelectItem value="unanswered">Unanswered applicable</SelectItem>
          <SelectItem value="unresolved">Scope unresolved</SelectItem><SelectItem value="evidence">Missing required evidence</SelectItem><SelectItem value="unreviewed">Awaiting architect review</SelectItem>
          <SelectItem value="assigned">Assigned / flagged</SelectItem><SelectItem value="revalidate">Needs revalidation</SelectItem>
        </SelectContent></Select>
        <span className="text-sm text-muted-foreground self-center">{rows.length} questions</span>
      </div>
      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="text-left text-xs text-muted-foreground border-b bg-secondary/40"><tr><th className="p-2.5">ID</th><th className="p-2.5">Question</th><th className="p-2.5">Applicability</th><th className="p-2.5">Answer</th><th className="p-2.5">Review</th><th className="p-2.5">Evidence</th><th className="p-2.5">Confidence</th></tr></thead>
          <tbody>
            {rows.map((x) => { const a = answers[x.id]; return (
              <tr key={x.id} className="border-b last:border-0 hover:bg-secondary/40 cursor-pointer" onClick={() => setOpen(x.id)} onKeyDown={(e) => e.key === "Enter" && setOpen(x.id)} tabIndex={0}>
                <td className="p-2.5 font-mono text-xs">{x.id}</td>
                <td className="p-2.5">{x.label}{assigned.has(x.id) && <Pill tone="info" className="ml-2">assigned</Pill>}</td>
                <td className="p-2.5"><Pill tone={appl[x.id] === "applicable" ? "outline" : appl[x.id] === "unresolved" ? "warning" : "muted"}>{appl[x.id].replace("_", " ")}</Pill></td>
                <td className="p-2.5">{a ? <Pill tone={a.state === "known" ? "success" : "warning"}>{a.state.replace("_", " ")}</Pill> : <span className="text-muted-foreground">—</span>}{a?.needs_revalidation && <Pill tone="warning" className="ml-1">revalidate</Pill>}</td>
                <td className="p-2.5 text-xs">{a?.review_status ?? "—"}</td>
                <td className="p-2.5 text-xs">{x.evidenceRequired ? (evidencedIds.has(x.id) ? "✓ attached" : "required") : "optional"}</td>
                <td className="p-2.5 text-xs">{(a as { confidence?: string })?.confidence?.replace("_", " ") ?? "—"}</td>
              </tr>); })}
          </tbody>
        </table>
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader><SheetTitle>Edit {open}</SheetTitle></SheetHeader>
          <div className="mt-4">{open && card(open)}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
