import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import type { Finding, Requirement, RegisterItem } from "@/lib/models";
import { AXES, COMPLEXITY_ANCHORS } from "@/domain/axes";
import { allAxisScores } from "@/domain/scoring";
import { GATES, GATE_STATES, goLiveReady, readinessCategory, readinessScore } from "@/domain/readiness";
import { priorityBand } from "@/domain/scoring";
import { PageHeader, Pill, Stat } from "@/components/app/bits";

interface CScore { id: string; axis: number; score: number | null; rationale: string; uncertainty: boolean; reviewed: boolean }
interface Gate { id: string; gate_no: number; state: number; assessed: boolean; applicable: boolean; na_reason: string; na_reviewed: boolean; evidence_note: string }

export default function Analysis() {
  return (
    <div>
      <PageHeader kicker="Analysis" title="Capability, complexity and readiness" description="Three separate measures, never blended. Insufficient evidence is shown as N/A rather than a false zero." />
      <Tabs defaultValue="capability">
        <TabsList><TabsTrigger value="capability">Capability spider</TabsTrigger><TabsTrigger value="complexity">Migration complexity</TabsTrigger><TabsTrigger value="readiness">Readiness gates</TabsTrigger></TabsList>
        <TabsContent value="capability"><Capability /></TabsContent>
        <TabsContent value="complexity"><Complexity /></TabsContent>
        <TabsContent value="readiness"><Readiness /></TabsContent>
      </Tabs>
    </div>
  );
}

function Capability() {
  const { assessment } = useAssessment();
  const reqs = useAssessmentTable<Requirement>("requirements", assessment.id);
  const [scope, setScope] = useState("all");
  const [showProposed, setShowProposed] = useState(false);
  const data = (reqs.data ?? []).filter((r) => !r.archived && (scope === "all" || r.scope === scope));
  const scores = useMemo(() => allAxisScores(data), [data]);
  const proposed = useMemo(() => allAxisScores(data.filter((r) => r.proposed_coverage !== null).map((r) => ({ ...r, current_score: r.proposed_coverage }))), [data]);
  const chart = AXES.map((a, i) => ({ axis: a.short, current: scores[i].suppressed ? 0 : scores[i].current, target: scores[i].suppressed ? 0 : scores[i].target, proposed: proposed[i].suppressed ? 0 : proposed[i].current }));
  const scopes = Array.from(new Set((reqs.data ?? []).map((r) => r.scope))).filter(Boolean);
  return (
    <div className="mt-4 grid lg:grid-cols-5 gap-4">
      <div className="card-elevated p-4 lg:col-span-3">
        <div className="flex flex-wrap gap-3 items-center mb-2">
          <Select value={scope} onValueChange={setScope}><SelectTrigger className="w-60" aria-label="Scope"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All scopes</SelectItem>{scopes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <label className="flex items-center gap-2 text-sm"><Switch checked={showProposed} onCheckedChange={setShowProposed} />Show validated proposed-design coverage</label>
        </div>
        <div className="h-[460px]" role="img" aria-label="Capability radar chart; see the table for values">
          <ResponsiveContainer>
            <RadarChart data={chart} outerRadius="72%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
              <Radar name="Target T" dataKey="target" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.08} strokeDasharray="5 3" />
              <Radar name="Current C" dataKey="current" stroke="hsl(var(--teal))" fill="hsl(var(--teal))" fillOpacity={0.25} />
              {showProposed && <Radar name="Proposed design" dataKey="proposed" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.1} />}
              <Legend /><Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground">Suppressed axes plot at zero for shape only and are labelled N/A in the table — they are not a score of zero.</p>
      </div>
      <div className="card-elevated lg:col-span-2 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Capability by axis</caption>
          <thead className="text-xs text-muted-foreground border-b bg-secondary/40"><tr><th className="p-2 text-left">Axis</th><th className="p-2">C</th><th className="p-2">T</th><th className="p-2">Gap</th><th className="p-2">Cov.</th></tr></thead>
          <tbody>{scores.map((s, i) => (
            <tr key={s.axis} className="border-b last:border-0">
              <td className="p-2">{AXES[i].no}. {AXES[i].short}{s.suppressed && <div className="text-[11px] text-warning">{s.reason}</div>}</td>
              <td className="p-2 text-center">{s.suppressed ? "N/A" : s.current}</td><td className="p-2 text-center">{s.suppressed ? "N/A" : s.target}</td>
              <td className="p-2 text-center font-semibold">{s.suppressed ? "N/A" : s.gap}</td>
              <td className="p-2 text-center text-xs">{s.coverage === null ? "—" : `${Math.round(s.coverage * 100)}%`}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function Complexity() {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const rows = useAssessmentTable<CScore>("complexity_scores", assessment.id);
  const regs = useAssessmentTable<RegisterItem>("register_items", assessment.id);
  const get = (a: number) => rows.data?.find((r) => r.axis === a);
  const upsert = async (axis: number, patch: Partial<CScore>) => {
    const cur = get(axis);
    const row = { assessment_id: assessment.id, project_id: project.id, axis, score: cur?.score ?? null, rationale: cur?.rationale ?? "", uncertainty: cur?.uncertainty ?? false, reviewed: cur?.reviewed ?? false, ...patch, ...(patch.reviewed ? { reviewed_by: user!.id } : {}) };
    const { error } = await db.from("complexity_scores").upsert(row, { onConflict: "assessment_id,axis" });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["complexity_scores", assessment.id] });
  };
  const counts = (t: string) => (regs.data ?? []).filter((r) => r.register_type === t && !r.archived).length;
  const hint: Record<number, string> = { 2: `${counts("catalog")} catalog items`, 3: `${counts("logic")} logic artifacts`, 5: `${counts("document")} docs/approvals`, 8: `${counts("integration")} integrations`, 9: `${counts("component")} custom components`, 10: `${counts("data")} data objects`, 11: `${counts("report")} reports` };
  const scored = (rows.data ?? []).filter((r) => r.score !== null && r.reviewed);
  const avg = scored.length ? (scored.reduce((s, r) => s + r.score!, 0) / scored.length).toFixed(1) : null;
  return (
    <div className="mt-4">
      <div className="grid sm:grid-cols-3 gap-3 mb-4"><Stat label="Reviewed axes" value={`${scored.length}/12`} /><Stat label="Mean reviewed complexity" value={avg ?? "N/A"} /><Stat label="Axes flagged uncertain" value={(rows.data ?? []).filter((r) => r.uncertainty).length} tone="warning" /></div>
      <div className="space-y-2">
        {AXES.map((a) => { const r = get(a.no); return (
          <div key={a.no} className="card-elevated p-3 grid md:grid-cols-12 gap-3 items-start">
            <div className="md:col-span-3"><div className="font-medium text-sm">{a.no}. {a.name}</div><div className="text-xs text-muted-foreground">Sources: {a.sources}{hint[a.no] && ` · ${hint[a.no]}`}</div></div>
            <div className="md:col-span-3"><Select disabled={!me.canEditInternal} value={r?.score ? String(r.score) : "none"} onValueChange={(v) => upsert(a.no, { score: v === "none" ? null : Number(v) })}><SelectTrigger aria-label={`Complexity for ${a.name}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not scored</SelectItem>{COMPLEXITY_ANCHORS.map((c, i) => <SelectItem key={i} value={String(i + 1)}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-4"><Textarea disabled={!me.canEditInternal} rows={1} defaultValue={r?.rationale ?? ""} placeholder="Rationale and evidence" onBlur={(e) => e.target.value !== (r?.rationale ?? "") && upsert(a.no, { rationale: e.target.value })} /></div>
            <div className="md:col-span-2 flex flex-col gap-1 text-xs">
              <label className="flex items-center gap-2"><Switch disabled={!me.canEditInternal} checked={!!r?.uncertainty} onCheckedChange={(c) => upsert(a.no, { uncertainty: c })} />Uncertain</label>
              <label className="flex items-center gap-2"><Switch disabled={!me.canEditInternal} checked={!!r?.reviewed} onCheckedChange={(c) => upsert(a.no, { reviewed: c })} />Reviewed</label>
            </div>
          </div>); })}
      </div>
    </div>
  );
}

function Readiness() {
  const { assessment, project, me } = useAssessment();
  const qc = useQueryClient();
  const gates = useAssessmentTable<Gate>("readiness_gates", assessment.id);
  const findings = useAssessmentTable<Finding>("findings", assessment.id);
  const scen = useAssessmentTable<RegisterItem>("register_items", assessment.id);
  const inputs = (gates.data ?? []).map((g) => ({ gate_no: g.gate_no, state: g.state, applicable: g.applicable, na_reviewed: g.na_reviewed, assessed: g.assessed }));
  const score = readinessScore(inputs);
  const blockers = {
    openP1Blockers: (findings.data ?? []).filter((f) => f.status !== "closed" && ["P1", "Blocker"].includes(priorityBand(f))).length,
    mandatoryAcceptanceFailed: (scen.data ?? []).some((s) => s.register_type === "scenario" && s.data?.result === "fail"),
    criticalDecisionUnresolved: (findings.data ?? []).some((f) => f.status !== "closed" && f.rule_id === "G01"),
  };
  const live = goLiveReady(inputs, blockers);
  const upsert = async (gate_no: number, patch: Partial<Gate>) => {
    const cur = gates.data?.find((g) => g.gate_no === gate_no);
    if (patch.applicable === false && !(patch.na_reason ?? cur?.na_reason)) { /* reason captured next */ }
    const row = { assessment_id: assessment.id, project_id: project.id, gate_no, state: cur?.state ?? 0, assessed: true, applicable: cur?.applicable ?? true, na_reason: cur?.na_reason ?? "", na_reviewed: cur?.na_reviewed ?? false, evidence_note: cur?.evidence_note ?? "", ...patch };
    if (patch.applicable === true) row.na_reviewed = false;
    const { error } = await db.from("readiness_gates").upsert(row, { onConflict: "assessment_id,gate_no" });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["readiness_gates", assessment.id] });
  };
  return (
    <div className="mt-4">
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Readiness score" value={score === null ? "N/A" : `${score}%`} sub={readinessCategory(score)} />
        <Stat label="Go-live ready" value={live.ready ? "Yes" : "No"} tone={live.ready ? "success" : "destructive"} sub="Gates override the percentage" />
        <Stat label="Open P1 / blockers" value={blockers.openP1Blockers} tone={blockers.openP1Blockers ? "destructive" : undefined} />
      </div>
      {!live.ready && <ul className="card-elevated p-3 mb-4 text-xs space-y-0.5">{live.reasons.slice(0, 14).map((r) => <li key={r}>• {r}</li>)}</ul>}
      <div className="space-y-2">
        {GATES.map((g) => { const r = gates.data?.find((x) => x.gate_no === g.no); return (
          <div key={g.no} className="card-elevated p-3 grid md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-3"><div className="font-medium text-sm">G{g.no}. {g.name}</div><div className="text-xs text-muted-foreground">Weight {g.weight}%</div></div>
            <div className="md:col-span-3"><Select disabled={!me.canEditInternal || r?.applicable === false} value={String(r?.state ?? 0)} onValueChange={(v) => upsert(g.no, { state: Number(v) })}><SelectTrigger aria-label={`State for gate ${g.no}`}><SelectValue /></SelectTrigger><SelectContent>{GATE_STATES.map((s, i) => <SelectItem key={i} value={String(i)}>{i} · {s}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-3"><Input disabled={!me.canEditInternal} defaultValue={r?.evidence_note ?? ""} placeholder="Evidence reference" onBlur={(e) => e.target.value !== (r?.evidence_note ?? "") && upsert(g.no, { evidence_note: e.target.value })} /></div>
            <div className="md:col-span-3 text-xs space-y-1">
              <label className="flex items-center gap-2"><Switch disabled={!me.canEditInternal} checked={r?.applicable === false} onCheckedChange={(c) => upsert(g.no, { applicable: !c })} />Not applicable</label>
              {r?.applicable === false && <>
                <Input className="h-7 text-xs" defaultValue={r.na_reason} placeholder="Justification (required)" onBlur={(e) => upsert(g.no, { na_reason: e.target.value })} />
                <label className="flex items-center gap-2"><Switch disabled={!me.canEditInternal || !r.na_reason} checked={r.na_reviewed} onCheckedChange={(c) => upsert(g.no, { na_reviewed: c })} />Architect reviewed N/A {r.na_reviewed ? <Pill tone="teal">reweighted</Pill> : <Pill tone="warning">pending</Pill>}</label>
              </>}
            </div>
          </div>); })}
      </div>
    </div>
  );
}
