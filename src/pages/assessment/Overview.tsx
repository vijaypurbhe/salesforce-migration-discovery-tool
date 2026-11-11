import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { MODULES, QUESTION_BY_ID } from "@/domain/questionBank";
import { computeCoverage } from "@/domain/coverage";
import { PageHeader, Pill, Stat, fmtDate, fmtPct } from "@/components/app/bits";
import { db, must } from "@/lib/db";
import { STAGES, type Assignment, type Finding } from "@/lib/models";
import { priorityBand } from "@/domain/scoring";

export default function Overview() {
  const { assessment, answers, evidencedIds, me, project } = useAssessment();
  const qc = useQueryClient();
  const cov = computeCoverage(answers, evidencedIds, { bulkNa: assessment.bulk_na });
  const findings = useAssessmentTable<Finding>("findings", assessment.id);
  const assignments = useAssessmentTable<Assignment>("assignments", assessment.id);
  const audit = useQuery({ queryKey: ["audit", assessment.id], enabled: me.isInternal, queryFn: () => must<any[]>(db.from("audit_events").select("*").eq("assessment_id", assessment.id).order("created_at", { ascending: false }).limit(12)) });
  const [form, setForm] = useState({ stage: assessment.stage, target_product_name: assessment.target_product_name, target_release: assessment.target_release, entitlement_notes: assessment.entitlement_notes, name: assessment.name });
  useEffect(() => setForm({ stage: assessment.stage, target_product_name: assessment.target_product_name, target_release: assessment.target_release, entitlement_notes: assessment.entitlement_notes, name: assessment.name }), [assessment]);
  const save = async () => {
    const { error } = await db.from("assessments").update(form).eq("id", assessment.id);
    if (error) toast.error(error.message); else {
      if (assessment.stage === "discovery" && ["architect_review", "customer_validation", "proposal", "baselined"].includes(form.stage)) {
        window.__lovableEvents?.track?.("project.discovery_completed", { is_demo: project.is_demo });
      }
      if (assessment.stage !== "proposal" && form.stage === "proposal") {
        window.__lovableEvents?.track?.("project.proposal_created", { is_demo: project.is_demo });
      }
      toast.success("Assessment updated"); qc.invalidateQueries({ queryKey: ["assessment", assessment.id] });
    }
  };
  const f = findings.data ?? [];
  const blockers = f.filter((x) => x.status !== "closed" && (x.is_blocker || priorityBand(x) === "P1")).length;
  const unknowns = Object.entries(answers).filter(([, a]) => a.state === "unknown" || a.state === "needs_validation");
  const open = (assignments.data ?? []).filter((a) => a.status === "open");

  return (
    <div>
      <PageHeader kicker={`${assessment.code} · template ${assessment.template_version} · ${assessment.rubric_version}`} title={assessment.name}
        description={<>Target label: <b>{assessment.target_product_name}</b>{assessment.target_release ? ` · release ${assessment.target_release}` : ""}. Product naming is editable and does not establish entitlement.</>}
        actions={<Button asChild><Link to="discovery">Continue discovery</Link></Button>} />
      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <Stat label="Answer coverage" value={fmtPct(cov.answerPct)} sub={`${cov.answered}/${cov.applicable} applicable answered`} />
        <Stat label="Unknown / needs validation" value={cov.answeredUnknown} sub="stay in the denominator" tone={cov.answeredUnknown ? "warning" : undefined} />
        <Stat label="Routing unresolved" value={cov.routingUnresolved} tone={cov.routingUnresolved ? "warning" : undefined} />
        <Stat label="Findings" value={f.length} sub={`${f.filter((x) => x.needs_review).length} need review`} />
        <Stat label="Open blockers / P1" value={blockers} tone={blockers ? "destructive" : "success"} />
      </div>
      <div className="grid xl:grid-cols-[1fr_380px] gap-6 mt-6">
        <section className="card-elevated p-5">
          <h2 className="font-bold mb-4">Module progress</h2>
          <ul className="grid md:grid-cols-2 gap-x-8 gap-y-3">
            {MODULES.map((m) => { const c = computeCoverage(answers, evidencedIds, { modules: [m.code], bulkNa: assessment.bulk_na }); return (
              <li key={m.code}>
                <div className="flex justify-between text-sm"><Link to={`discovery?view=guided&q=${m.code}01`} className="hover:underline"><span className="font-mono text-xs mr-2">{m.code}</span>{m.name}</Link><span className="text-muted-foreground">{fmtPct(c.answerPct)}</span></div>
                <Progress value={c.answerPct ?? 0} className="h-1.5 mt-1" aria-label={`${m.name} coverage`} />
                {c.routingUnresolved > 0 && <span className="text-[11px] text-warning">{c.routingUnresolved} scope unresolved</span>}
              </li>); })}
          </ul>
        </section>
        <aside className="space-y-4">
          <section className="card-elevated p-5 space-y-3">
            <h2 className="font-bold">Assessment details</h2>
            <div><Label htmlFor="an">Name</Label><Input id="an" disabled={!me.canEditInternal} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Stage</Label><Select disabled={!me.canEditInternal} value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label htmlFor="tp">Target product label</Label><Input id="tp" disabled={!me.canEditInternal} value={form.target_product_name} onChange={(e) => setForm({ ...form, target_product_name: e.target.value })} /></div>
              <div><Label htmlFor="tr">Target release</Label><Input id="tr" disabled={!me.canEditInternal} value={form.target_release} onChange={(e) => setForm({ ...form, target_release: e.target.value })} /></div>
            </div>
            <div><Label htmlFor="en">Entitlement notes</Label><Textarea id="en" disabled={!me.canEditInternal} value={form.entitlement_notes} onChange={(e) => setForm({ ...form, entitlement_notes: e.target.value })} /></div>
            {me.canEditInternal && <Button onClick={save} size="sm">Save details</Button>}
          </section>
        </aside>
      </div>
      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <section className="card-elevated p-5">
          <h2 className="font-bold mb-3">Unknowns queue ({unknowns.length})</h2>
          <ul className="space-y-2 text-sm max-h-72 overflow-y-auto">
            {unknowns.map(([id, a]) => <li key={id}><Link className="hover:underline" to={`discovery?view=workbench`}><span className="font-mono text-xs mr-2">{id}</span>{QUESTION_BY_ID[id]?.label}</Link> <Pill tone="warning">{a.state.replace("_", " ")}</Pill></li>)}
            {!unknowns.length && <li className="text-muted-foreground">No unknown answers.</li>}
          </ul>
        </section>
        <section className="card-elevated p-5">
          <h2 className="font-bold mb-3">Open assignments ({open.length})</h2>
          <ul className="space-y-2 text-sm max-h-72 overflow-y-auto">
            {open.map((a) => <li key={a.id} className="flex gap-2 items-start"><Pill tone="info">{a.kind.replace("_", " ")}</Pill><span><span className="font-mono text-xs">{a.question_id}</span> {a.assignee_label} {a.due_date && <span className="text-muted-foreground">· due {a.due_date}</span>}<br /><span className="text-muted-foreground text-xs">{a.note}</span></span>
              {!me.readOnly && <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={async () => { await db.from("assignments").update({ status: "done" }).eq("id", a.id); assignments.refetch(); }}>Done</Button>}</li>)}
            {!open.length && <li className="text-muted-foreground">Nothing assigned.</li>}
          </ul>
        </section>
        {me.isInternal && (
          <section className="card-elevated p-5">
            <h2 className="font-bold mb-3">Recent activity</h2>
            <ul className="space-y-2 text-sm max-h-72 overflow-y-auto">
              {(audit.data ?? []).map((e) => <li key={e.id}><span className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</span><br />{e.summary || e.action}</li>)}
            </ul>
          </section>
        )}
      </div>
      {project.is_demo && <p className="text-xs text-muted-foreground mt-6">Demo walkthrough: open Discovery → P06 (QCP) then Inventories → Logic; open Delta & gap analysis → run analysis to see G01, G12, G15, G22; Proposal shows an unestimated work package.</p>}
    </div>
  );
}
