import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, Plus, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { runAnalysis } from "@/lib/analysis";
import { FIT_STATUSES, type Finding, type WorkPackage } from "@/lib/models";
import { priorityBand, priorityIndex } from "@/domain/scoring";
import { PRIORITY_ANCHORS } from "@/domain/axes";
import { PageHeader, Pill, EmptyState, type Tone } from "@/components/app/bits";
import { FitPill } from "@/components/app/ToneFit";
import { CommentsSheet } from "@/components/discovery/QuestionActions";
import { download, toCsv } from "@/lib/csv";

const BAND_TONE: Record<string, Tone> = { Blocker: "destructive", P1: "destructive", P2: "warning", P3: "info", P4: "muted", Unscored: "outline" };
const STATUSES = ["open", "in_review", "accepted", "closed", "reopened"];
const KINDS = ["delta", "gap", "risk", "dependency", "assumption", "decision", "blocker", "validation"];

export default function Findings() {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const f = useAssessmentTable<Finding>("findings", assessment.id, { order: "code" });
  const wps = useAssessmentTable<WorkPackage>("work_packages", assessment.id, { order: "code" });
  const [band, setBand] = useState("all"); const [kind, setKind] = useState("all"); const [status, setStatus] = useState("active"); const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<Finding> | null>(null);
  const [running, setRunning] = useState(false);
  const list = useMemo(() => (f.data ?? []).filter((x) =>
    (band === "all" || priorityBand(x) === band) && (kind === "all" || x.kinds.includes(kind)) &&
    (status === "all" || (status === "active" ? x.status !== "closed" : x.status === status)) &&
    (!q || `${x.code} ${x.title} ${x.rule_id} ${x.domain}`.toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => (priorityIndex(b) ?? -1) + (b.is_blocker ? 1000 : 0) - (priorityIndex(a) ?? -1) - (a.is_blocker ? 1000 : 0)), [f.data, band, kind, status, q]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["findings", assessment.id] });

  const run = async () => {
    setRunning(true);
    try { const r = await runAnalysis(assessment.id, project.id, user!.id); toast.success(`Analysis complete: ${r.created} new, ${r.updated} updated, ${r.flagged} flagged for review`); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setRunning(false); }
  };
  const save = async () => {
    if (!edit?.title) return toast.error("Title is required.");
    if (edit.status === "closed" && !edit.decision_rationale?.trim()) return toast.error("Closing a finding requires a decision rationale.");
    const p: Record<string, unknown> = { ...edit };
    ["id", "assessment_id", "project_id", "created_at", "updated_at", "created_by"].forEach((k) => delete p[k]);
    if (edit.id) p.needs_review = false;
    const res = edit.id ? await db.from("findings").update(p).eq("id", edit.id)
      : await db.from("findings").insert({ ...p, manual: true, rule_id: "MANUAL", finding_key: crypto.randomUUID(), code: `F-${String((f.data?.length ?? 0) + 1).padStart(3, "0")}`, assessment_id: assessment.id, project_id: project.id, created_by: user!.id });
    if (res.error) return toast.error(res.error.message);
    await db.from("audit_events").insert({ project_id: project.id, assessment_id: assessment.id, actor: user!.id, action: edit.id ? "finding.updated" : "finding.created", object_type: "finding", object_id: edit.code ?? "new", summary: `${edit.title} → ${edit.status}` });
    setEdit(null); refresh();
  };
  const exportCsv = () => download(`${assessment.code}-findings.csv`, toCsv(list.map((x) => ({ ...x, priority: priorityBand(x), index: priorityIndex(x) ?? "", kinds: x.kinds.join("|"), linked_question_ids: x.linked_question_ids.join("|") })), ["code", "rule_id", "title", "domain", "kinds", "priority", "index", "fit_status", "status", "confidence", "current_state", "required_state", "proposed_treatment", "validation_task", "acceptance_criterion", "owner_label", "due_date", "linked_question_ids"]));
  const review = (f.data ?? []).filter((x) => x.needs_review).length;
  const set = (k: keyof Finding, v: unknown) => setEdit({ ...edit!, [k]: v });
  const sc = (k: keyof Finding) => (
    <div><Label>{k.toString().replace("_", " ")}</Label><Select value={edit?.[k] === null || edit?.[k] === undefined ? "none" : String(edit[k])} onValueChange={(v) => set(k, v === "none" ? null : Number(v))}><SelectTrigger className="capitalize"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unscored</SelectItem>{PRIORITY_ANCHORS.map((a, i) => <SelectItem key={i} value={String(i + 1)}>{a}</SelectItem>)}</SelectContent></Select></div>
  );

  return (
    <div>
      <PageHeader kicker="Findings, gaps and deltas" title="Findings register"
        description="Generated deterministically by versioned rules G01–G24 and editable by architects. Re-running is idempotent: manual decisions are preserved and changed inputs are flagged for review."
        actions={<>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
          {me.canEditInternal && <Button variant="outline" size="sm" onClick={() => setEdit({ title: "", kinds: ["gap"], status: "open", fit_status: "validation_pending", confidence: "self_reported", visibility: "customer", linked_question_ids: [], impact: null, urgency: null, delivery_risk: null, dependency_criticality: null })}><Plus className="h-4 w-4 mr-1" />Manual finding</Button>}
          {me.canEditInternal && <Button size="sm" onClick={run} disabled={running}><Play className="h-4 w-4 mr-1" />{running ? "Running…" : "Run analysis"}</Button>}
        </>} />
      {review > 0 && <div className="mb-4 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm flex gap-2"><AlertTriangle className="h-4 w-4 text-warning mt-0.5" aria-hidden />{review} finding(s) need review because their source answers changed since the last decision.</div>}
      <div className="flex flex-wrap gap-2 mb-3">
        <Input aria-label="Search findings" className="w-64" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={band} onValueChange={setBand}><SelectTrigger className="w-40" aria-label="Priority"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem>{["Blocker", "P1", "P2", "P3", "P4", "Unscored"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
        <Select value={kind} onValueChange={setKind}><SelectTrigger className="w-40" aria-label="Kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All kinds</SelectItem>{KINDS.map((b) => <SelectItem key={b} value={b} className="capitalize">{b}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40" aria-label="Status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Not closed</SelectItem><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((b) => <SelectItem key={b} value={b}>{b.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
        <span className="text-xs text-muted-foreground self-center">{list.length} shown</span>
      </div>
      {list.length === 0 ? <EmptyState title="No findings match">Run analysis after answering questions and populating registers.</EmptyState> : (
        <div className="space-y-2">
          {list.map((x) => { const b = priorityBand(x); return (
            <div key={x.id} className="card-elevated p-4">
              <div className="flex flex-wrap items-start gap-2">
                <span className="font-mono text-xs text-muted-foreground mt-0.5">{x.code} · {x.rule_id}</span>
                <Pill tone={BAND_TONE[b]}>{b}{priorityIndex(x) !== null ? ` · ${priorityIndex(x)}` : ""}</Pill>
                {x.kinds.map((k) => <Pill key={k} tone="outline">{k}</Pill>)}
                <FitPill v={x.fit_status} />
                <Pill tone={x.status === "closed" ? "muted" : "info"}>{x.status.replace("_", " ")}</Pill>
                {x.needs_review && <Pill tone="warning">needs review</Pill>}
                {x.visibility === "internal" && <Pill tone="warning">internal</Pill>}
                <div className="ml-auto flex gap-1">
                  <CommentsSheet targetType="finding" targetId={x.code} />
                  {me.canEditInternal && <Button size="sm" variant="outline" onClick={() => setEdit(x)}>Edit</Button>}
                </div>
              </div>
              <h3 className="font-semibold mt-2">{x.title}</h3>
              <div className="grid md:grid-cols-3 gap-3 mt-2 text-sm">
                <div><div className="text-xs text-muted-foreground">Current</div>{x.current_state || "—"}</div>
                <div><div className="text-xs text-muted-foreground">Required</div>{x.required_state || "—"}</div>
                <div><div className="text-xs text-muted-foreground">Next validation</div>{x.validation_task || "—"}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Questions: {x.linked_question_ids.join(", ") || "—"} · Confidence: {x.confidence.replace("_", " ")} {x.owner_label && `· Owner: ${x.owner_label}`} {x.due_date && `· Due ${x.due_date}`}</div>
            </div>); })}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.code ?? "Manual finding"}</DialogTitle><DialogDescription>Priority index = 20 × (0.4 impact + 0.2 urgency + 0.25 delivery risk + 0.15 dependency criticality). Missing inputs leave it unscored.</DialogDescription></DialogHeader>
          {edit && <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Title</Label><Input value={edit.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
            <div><Label>Kinds</Label><div className="flex flex-wrap gap-2 mt-1">{KINDS.map((k) => <label key={k} className="flex items-center gap-1 text-xs"><Checkbox checked={edit.kinds?.includes(k)} onCheckedChange={(c) => set("kinds", c ? [...(edit.kinds ?? []), k] : (edit.kinds ?? []).filter((x) => x !== k))} />{k}</label>)}</div></div>
            <div><Label>Domain</Label><Input value={edit.domain ?? ""} onChange={(e) => set("domain", e.target.value)} /></div>
            <div><Label>Current state</Label><Textarea value={edit.current_state ?? ""} onChange={(e) => set("current_state", e.target.value)} /></div>
            <div><Label>Required state</Label><Textarea value={edit.required_state ?? ""} onChange={(e) => set("required_state", e.target.value)} /></div>
            {sc("impact")}{sc("urgency")}{sc("delivery_risk")}{sc("dependency_criticality")}
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!edit.is_blocker} onCheckedChange={(c) => set("is_blocker", !!c)} />Explicit go-live blocker</label>
            <div><Label>Fit status</Label><Select value={edit.fit_status} onValueChange={(v) => set("fit_status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FIT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={edit.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Confidence</Label><Select value={edit.confidence} onValueChange={(v) => set("confidence", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["self_reported", "evidence_attached", "architect_reviewed", "customer_validated", "unknown"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Proposed treatment</Label><Input value={edit.proposed_treatment ?? ""} onChange={(e) => set("proposed_treatment", e.target.value)} /></div>
            <div><Label>Owner</Label><Input value={edit.owner_label ?? ""} onChange={(e) => set("owner_label", e.target.value)} /></div>
            <div><Label>Due date</Label><Input type="date" value={edit.due_date ?? ""} onChange={(e) => set("due_date", e.target.value || null)} /></div>
            <div><Label>Work package</Label><Select value={edit.work_package_id ?? "none"} onValueChange={(v) => set("work_package_id", v === "none" ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{(wps.data ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.code} {w.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Visibility</Label><Select value={edit.visibility} onValueChange={(v) => set("visibility", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="customer">Customer-visible</SelectItem><SelectItem value="internal">Internal</SelectItem></SelectContent></Select></div>
            <div className="sm:col-span-2"><Label>Next validation task</Label><Input value={edit.validation_task ?? ""} onChange={(e) => set("validation_task", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Acceptance criterion</Label><Input value={edit.acceptance_criterion ?? ""} onChange={(e) => set("acceptance_criterion", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Decision / rationale (required to close)</Label><Textarea value={edit.decision_rationale ?? ""} onChange={(e) => set("decision_rationale", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Internal wording (never exported to customer)</Label><Textarea value={edit.internal_wording ?? ""} onChange={(e) => set("internal_wording", e.target.value)} /></div>
          </div>}
          <DialogFooter><Button onClick={save}>Save finding</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
