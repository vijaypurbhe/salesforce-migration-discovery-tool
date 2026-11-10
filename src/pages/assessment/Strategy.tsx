import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import type { Strategy } from "@/lib/models";
import { PageHeader, Pill, EmptyState } from "@/components/app/bits";

export const DESIGN_STRATEGIES = [
  { v: "partial", l: "Targeted / partial rationalization" },
  { v: "full_rationalization", l: "Full rationalization" },
  { v: "reimagine", l: "Reimagine / greenfield" },
  { v: "parity", l: "Parity-oriented full migration (still a rebuild in target constructs — not a package upgrade)" },
];
const DEPLOY = ["Same production org", "Existing different org", "New org", "undecided"];
const ROLLOUT = ["One cutover", "By BU/region", "By product", "By channel", "New business first, legacy lifecycle retained temporarily", "undecided"];
export const CRITERIA = [
  { k: "speed", l: "Speed to initial value" }, { k: "disruption", l: "Low disruption" }, { k: "simplicity", l: "Long-term simplicity" },
  { k: "coverage", l: "Capability coverage" }, { k: "continuity", l: "Data continuity" }, { k: "dependencies", l: "Low external dependencies" }, { k: "cost", l: "Cost" },
];
const DETAILS = [
  ["outcomes", "Business outcomes & retained legacy responsibilities"], ["catalog_pricing", "Catalog and pricing treatment"], ["lifecycle", "Lifecycle migration treatment, history and data scope"],
  ["org", "Same/different-org implications & shared-record governance"], ["cohorts", "Rollout cohorts, pilot and parallel-operation period"], ["packages", "Initial and deferred work packages"],
  ["vendors_risks", "Vendor dependencies, risks and reversibility"], ["licenses", "Required licenses and validated supported combinations"], ["schedule", "Readiness gates, effort range, schedule constraints and confidence"],
  ["split_rules", "Mixed-product, renewal and ownership hand-off rules (required for any split rollout)"],
];

export default function StrategyPage() {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const sc = useAssessmentTable<Strategy>("strategy_scenarios", assessment.id, { order: "created_at" });
  const [edit, setEdit] = useState<Partial<Strategy> | null>(null);
  const [rec, setRec] = useState<Strategy | null>(null);
  const [recText, setRecText] = useState("");
  const weights: Record<string, number> = { ...Object.fromEntries(CRITERIA.map((c) => [c.k, 1])), ...(assessment.decision_weights ?? {}) };
  const refresh = () => qc.invalidateQueries({ queryKey: ["strategy_scenarios", assessment.id] });
  const total = (s: Strategy) => {
    if (CRITERIA.some((c) => typeof s.criteria_scores?.[c.k] !== "number")) return null;
    const w = CRITERIA.reduce((a, c) => a + (weights[c.k] ?? 0), 0);
    return w ? Math.round((CRITERIA.reduce((a, c) => a + (weights[c.k] ?? 0) * s.criteria_scores[c.k], 0) / w) * 100) / 100 : null;
  };
  const setWeight = async (k: string, v: number) => {
    const { error } = await db.from("assessments").update({ decision_weights: { ...weights, [k]: v } }).eq("id", assessment.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["assessment-bundle", assessment.id] });
  };
  const score = async (s: Strategy, k: string, v: string) => {
    const cs = { ...s.criteria_scores }; if (v === "none") delete cs[k]; else cs[k] = Number(v);
    await db.from("strategy_scenarios").update({ criteria_scores: cs, is_recommended: false, approved_by: null, approved_at: null }).eq("id", s.id); refresh();
  };
  const save = async () => {
    if (!edit?.name) return toast.error("Name is required.");
    const split = edit.rollout_pattern && !["One cutover", "undecided"].includes(edit.rollout_pattern);
    if (split && !edit.details?.split_rules?.trim()) return toast.error("A split rollout requires rules for mixed-product transactions, renewals and ownership hand-offs.");
    const p = { name: edit.name, design_strategy: edit.design_strategy, deployment_model: edit.deployment_model, rollout_pattern: edit.rollout_pattern, details: edit.details ?? {} };
    const res = edit.id ? await db.from("strategy_scenarios").update(p).eq("id", edit.id) : await db.from("strategy_scenarios").insert({ ...p, assessment_id: assessment.id, project_id: project.id, created_by: user!.id });
    if (res.error) return toast.error(res.error.message); setEdit(null); refresh();
  };
  const recommend = async () => {
    if (!rec) return;
    if (total(rec) === null) return toast.error("Score every criterion before recommending.");
    if (recText.trim().length < 30) return toast.error("Explain the recommendation and why alternatives were not preferred (min. 30 characters).");
    await db.from("strategy_scenarios").update({ is_recommended: false, approved_by: null, approved_at: null }).eq("assessment_id", assessment.id);
    const { error } = await db.from("strategy_scenarios").update({ is_recommended: true, recommendation_rationale: recText, approved_by: user!.id, approved_at: new Date().toISOString() }).eq("id", rec.id);
    if (error) return toast.error(error.message);
    await db.from("audit_events").insert({ project_id: project.id, assessment_id: assessment.id, actor: user!.id, action: "strategy.recommended", object_type: "strategy", object_id: rec.id, summary: rec.name });
    setRec(null); refresh();
  };
  const list = sc.data ?? [];
  return (
    <div>
      <PageHeader kicker="Migration options" title="Strategy and rollout comparison" description="Design strategy, deployment model and rollout pattern are separate decisions. No automatic “best” — a consultant must approve a recommendation with rationale."
        actions={me.canEditInternal && <Button size="sm" onClick={() => setEdit({ design_strategy: "partial", deployment_model: "undecided", rollout_pattern: "undecided", details: {} })}><Plus className="h-4 w-4 mr-1" />New scenario</Button>} />
      {list.length === 0 ? <EmptyState title="No scenarios yet">Create two or more scenarios to compare.</EmptyState> : (
        <div className="card-elevated overflow-x-auto mb-6">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-xs text-muted-foreground border-b bg-secondary/40"><tr><th className="p-2.5 text-left">Criterion</th><th className="p-2.5">Weight</th>{list.map((s) => <th key={s.id} className="p-2.5 text-left">{s.name}{s.is_recommended && <Pill tone="success" className="ml-1">recommended</Pill>}</th>)}</tr></thead>
            <tbody>
              <tr className="border-b text-xs"><td className="p-2.5">Design / deployment / rollout</td><td />{list.map((s) => <td key={s.id} className="p-2.5">{DESIGN_STRATEGIES.find((d) => d.v === s.design_strategy)?.l.split(" (")[0]}<br />{s.deployment_model} · {s.rollout_pattern}</td>)}</tr>
              {CRITERIA.map((c) => (
                <tr key={c.k} className="border-b">
                  <td className="p-2.5">{c.l}</td>
                  <td className="p-2.5 w-24"><Input aria-label={`Weight ${c.l}`} type="number" min={0} max={10} disabled={!me.canEditInternal} defaultValue={weights[c.k]} onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v <= 10 && v !== weights[c.k]) setWeight(c.k, v); }} /></td>
                  {list.map((s) => <td key={s.id} className="p-2.5"><Select disabled={!me.canEditInternal} value={typeof s.criteria_scores?.[c.k] === "number" ? String(s.criteria_scores[c.k]) : "none"} onValueChange={(v) => score(s, c.k, v)}><SelectTrigger className="w-28" aria-label={`${s.name} ${c.l}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unknown</SelectItem>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select></td>)}
                </tr>))}
              <tr className="font-semibold"><td className="p-2.5">Weighted score (1–5)</td><td />{list.map((s) => <td key={s.id} className="p-2.5">{total(s) ?? <span className="text-muted-foreground font-normal text-xs">Incomplete — inputs unknown</span>}</td>)}</tr>
              <tr><td className="p-2.5" colSpan={2} />{list.map((s) => <td key={s.id} className="p-2.5 space-x-1">{me.canEditInternal && <><Button size="sm" variant="outline" onClick={() => setEdit(s)}>Details</Button><Button size="sm" variant="ghost" onClick={() => { setRec(s); setRecText(s.recommendation_rationale ?? ""); }}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Recommend</Button></>}</td>)}</tr>
            </tbody>
          </table>
        </div>)}
      {list.filter((s) => s.is_recommended).map((s) => <div key={s.id} className="card-elevated p-4 border-l-4 border-l-success"><div className="text-xs text-muted-foreground">Approved recommendation · {s.approved_at && new Date(s.approved_at).toLocaleDateString()}</div><h3 className="font-semibold">{s.name}</h3><p className="text-sm mt-1 whitespace-pre-wrap">{s.recommendation_rationale}</p></div>)}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? edit.name : "New scenario"}</DialogTitle><DialogDescription>Never show savings or duration without linked inputs.</DialogDescription></DialogHeader>
          {edit && <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3"><Label>Name</Label><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div><Label>Design strategy</Label><Select value={edit.design_strategy} onValueChange={(v) => setEdit({ ...edit, design_strategy: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DESIGN_STRATEGIES.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Deployment model</Label><Select value={edit.deployment_model} onValueChange={(v) => setEdit({ ...edit, deployment_model: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPLOY.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Rollout pattern</Label><Select value={edit.rollout_pattern} onValueChange={(v) => setEdit({ ...edit, rollout_pattern: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLLOUT.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
            {DETAILS.map(([k, l]) => <div key={k} className="sm:col-span-3"><Label>{l}</Label><Textarea rows={2} value={edit.details?.[k] ?? ""} onChange={(e) => setEdit({ ...edit, details: { ...edit.details, [k]: e.target.value } })} /></div>)}
          </div>}
          <DialogFooter><Button onClick={save}>Save scenario</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!rec} onOpenChange={(o) => !o && setRec(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve recommendation: {rec?.name}</DialogTitle><DialogDescription>Records you as approver. Changing any score later withdraws the approval.</DialogDescription></DialogHeader>
          <Label htmlFor="rr">Rationale and reasons alternatives were not preferred</Label><Textarea id="rr" rows={5} value={recText} onChange={(e) => setRecText(e.target.value)} />
          <DialogFooter><Button onClick={recommend}>Approve recommendation</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
