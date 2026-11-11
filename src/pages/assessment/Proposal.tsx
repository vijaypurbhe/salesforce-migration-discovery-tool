import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Download, FileText, Lock, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { db, must } from "@/lib/db";
import type { CommercialInputs, EstimateLineRow, Requirement, WorkPackage, Finding } from "@/lib/models";
import { estimatePackage, estimateProgramme, roleCost, staffing, validateLine, type Contingency } from "@/domain/sizing";
import { PageHeader, Pill, EmptyState, Stat } from "@/components/app/bits";
import { buildPack, CUSTOMER_EXCLUSIONS, packToHtml, packToXlsx, type Audience } from "@/lib/exportPack";
import { download } from "@/lib/csv";
import { packToPdf, deliverProposal, type ProposalDocument } from "@/lib/proposalPdf";

export const SECTIONS = [
  "Executive problem statement and customer outcomes", "Evidence-backed current landscape and scope boundary", "Required future outcomes and candidate target architecture",
  "Capability delta, fit-gap summary, spider charts and unresolved items", "Recommended strategy, deployment and rollout and reasons", "Workstreams, deliverables, acceptance criteria and sequencing",
  "Data/transaction migration, coexistence, testing and cutover approach", "Effort, schedule and resource assumptions", "Customer and third-party responsibilities and dependencies",
  "Risk, assumption, decision and exclusion registers", "License/availability validation checklist and next workshops", "Traceability annex",
];
const WORKSTREAMS = ["Discovery/design", "Org/environment", "Catalog/configuration", "Pricing", "Seller UI/approvals", "Documents/contracts", "Lifecycle/assets", "Orders/downstream", "Integrations", "Customization", "Data", "Reporting", "Security", "Testing/performance", "Cutover", "Adoption/hypercare", "Program/architecture governance"];
const CONDITIONAL = ["Billing", "Usage", "Orchestration", "Agentforce"];
const ROLES = ["Engagement lead", "Solution architect", "Functional consultant", "Developer", "Data engineer", "Test lead"];

export default function Proposal() {
  const { me } = useAssessment();
  return (
    <div>
      <PageHeader kicker="Proposal workbench" title="Draft proposal input pack" description="Not a signed SOW. Every scope statement links to an approved requirement, gap, assumption or decision." />
      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Work packages</TabsTrigger>
          {me.canViewCommercials && <TabsTrigger value="estimate"><Lock className="h-3 w-3 mr-1" />Estimate & staffing</TabsTrigger>}
          <TabsTrigger value="narrative">Narrative</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        <TabsContent value="packages"><Packages /></TabsContent>
        {me.canViewCommercials && <TabsContent value="estimate"><Estimate /></TabsContent>}
        <TabsContent value="narrative"><Narrative /></TabsContent>
        <TabsContent value="export"><Export /></TabsContent>
      </Tabs>
    </div>
  );
}

function Packages() {
  const { assessment, project, me } = useAssessment();
  const qc = useQueryClient();
  const wps = useAssessmentTable<WorkPackage>("work_packages", assessment.id, { order: "code" });
  const reqs = useAssessmentTable<Requirement>("requirements", assessment.id, { order: "code" });
  const fs = useAssessmentTable<Finding>("findings", assessment.id, { order: "code" });
  const [edit, setEdit] = useState<Partial<WorkPackage> | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["work_packages", assessment.id] });
  const list = (wps.data ?? []).filter((w) => !w.archived);
  const seed = async () => {
    const have = new Set(list.map((w) => w.workstream));
    const rows = WORKSTREAMS.filter((w) => !have.has(w)).map((w, i) => ({ assessment_id: assessment.id, project_id: project.id, code: `WP-${String(list.length + i + 1).padStart(2, "0")}`, name: w, workstream: w, required: true }));
    if (!rows.length) return toast.info("All suggested workstreams exist.");
    const { error } = await db.from("work_packages").insert(rows); if (error) toast.error(error.message); else refresh();
  };
  const save = async () => {
    if (!edit?.name) return toast.error("Name is required.");
    if (CONDITIONAL.includes(edit.workstream ?? "") && !edit.conditional) return toast.error("Billing, usage, orchestration and Agentforce packages must be marked conditional and explicitly in scope.");
    const p: Record<string, unknown> = { ...edit }; ["id", "assessment_id", "project_id", "created_at", "updated_at", "created_by"].forEach((k) => delete p[k]);
    const res = edit.id ? await db.from("work_packages").update(p).eq("id", edit.id) : await db.from("work_packages").insert({ ...p, code: p.code || `WP-${String(list.length + 1).padStart(2, "0")}`, assessment_id: assessment.id, project_id: project.id });
    if (res.error) return toast.error(res.error.message); setEdit(null); refresh();
  };
  return (
    <div className="mt-4">
      {me.canEditInternal && <div className="flex gap-2 justify-end mb-3"><Button variant="outline" size="sm" onClick={seed}><Sparkles className="h-4 w-4 mr-1" />Add suggested workstreams</Button><Button size="sm" onClick={() => setEdit({ workstream: WORKSTREAMS[0], required: true, requirement_ids: [], finding_ids: [], visibility: "customer" })}><Plus className="h-4 w-4 mr-1" />New package</Button></div>}
      {list.length === 0 ? <EmptyState title="No work packages">Start from the suggested workstreams.</EmptyState> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((w) => (
            <div key={w.id} className="card-elevated p-4">
              <div className="flex items-start gap-2"><span className="font-mono text-xs text-muted-foreground">{w.code}</span>{w.conditional && <Pill tone="warning">conditional</Pill>}{!w.required && <Pill tone="muted">optional</Pill>}{w.wave && <Pill tone="outline">{w.wave}</Pill>}
                {me.canEditInternal && <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => setEdit(w)}>Edit</Button>}</div>
              <h3 className="font-semibold mt-1">{w.name}</h3>
              <p className="text-xs text-muted-foreground">{w.workstream}</p>
              <p className="text-sm mt-2 line-clamp-3">{w.deliverables || <span className="text-muted-foreground">No deliverables yet</span>}</p>
              <div className="text-xs text-muted-foreground mt-2">{w.requirement_ids.length} requirements · {w.finding_ids.length} findings</div>
              {w.requirement_ids.length + w.finding_ids.length === 0 && <div className="text-xs text-warning mt-1">Not yet linked to an approved requirement or gap</div>}
            </div>))}
        </div>)}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.code ?? "New work package"}</DialogTitle></DialogHeader>
          {edit && <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div><Label>Workstream</Label><Select value={edit.workstream} onValueChange={(v) => setEdit({ ...edit, workstream: v, conditional: CONDITIONAL.includes(v) || edit.conditional })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[...WORKSTREAMS, ...CONDITIONAL].map((w) => <SelectItem key={w} value={w}>{w}{CONDITIONAL.includes(w) ? " (conditional)" : ""}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Wave</Label><Input value={edit.wave ?? ""} onChange={(e) => setEdit({ ...edit, wave: e.target.value })} /></div>
            <div className="flex gap-4 items-end text-sm"><label className="flex items-center gap-2"><Checkbox checked={!!edit.required} onCheckedChange={(c) => setEdit({ ...edit, required: !!c })} />Required</label><label className="flex items-center gap-2"><Checkbox checked={!!edit.conditional} onCheckedChange={(c) => setEdit({ ...edit, conditional: !!c })} />Conditional</label></div>
            {(["deliverables", "acceptance_criteria", "dependencies", "customer_responsibilities", "assumptions"] as const).map((k) => <div key={k} className="sm:col-span-2"><Label className="capitalize">{k.replace("_", " ")}</Label><Textarea rows={2} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>)}
            <Picker label="Linked requirements" opts={(reqs.data ?? []).map((r) => ({ id: r.id, l: `${r.code} ${r.title}` }))} v={edit.requirement_ids ?? []} on={(v) => setEdit({ ...edit, requirement_ids: v })} />
            <Picker label="Linked findings / gaps" opts={(fs.data ?? []).map((r) => ({ id: r.id, l: `${r.code} ${r.title}` }))} v={edit.finding_ids ?? []} on={(v) => setEdit({ ...edit, finding_ids: v })} />
          </div>}
          <DialogFooter><Button onClick={save}>Save package</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Picker({ label, opts, v, on }: { label: string; opts: { id: string; l: string }[]; v: string[]; on: (v: string[]) => void }) {
  return <div><Label>{label}</Label><div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">{opts.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}{opts.map((o) => <label key={o.id} className="flex gap-2 text-xs"><Checkbox checked={v.includes(o.id)} onCheckedChange={(c) => on(c ? [...v, o.id] : v.filter((x) => x !== o.id))} />{o.l}</label>)}</div></div>;
}

const nz = (s: string) => (s === "" ? null : Number(s));
function Estimate() {
  const { assessment, project, me } = useAssessment();
  const qc = useQueryClient();
  const wps = useAssessmentTable<WorkPackage>("work_packages", assessment.id, { order: "code" });
  const lines = useAssessmentTable<EstimateLineRow>("estimate_lines", assessment.id, { order: "created_at" });
  const ci = useQuery({ queryKey: ["commercial_inputs", assessment.id], queryFn: () => must<CommercialInputs | null>(db.from("commercial_inputs").select("*").eq("assessment_id", assessment.id).maybeSingle()) });
  const catalog = useQuery({ queryKey: ["effort_catalog"], queryFn: () => must<{ unit_type: string; label: string; hours_low: number | null; hours_likely: number | null; hours_high: number | null; is_demo: boolean }[]>(db.from("effort_catalog").select("*").order("label")) });
  const c = ci.data;
  const required = (wps.data ?? []).filter((w) => w.required && !w.archived);
  const contingency: Contingency = c?.contingency_model === "percentage" && c.contingency_pct !== null ? { model: "percentage", pct: Number(c.contingency_pct) } : c?.contingency_model === "risk_hours" && c.risk_hours_low !== null && c.risk_hours_likely !== null && c.risk_hours_high !== null ? { model: "risk_hours", hours: { low: Number(c.risk_hours_low), likely: Number(c.risk_hours_likely), high: Number(c.risk_hours_high) } } : { model: "none" };
  const L = (lines.data ?? []).map((l) => ({ ...l, qty_low: l.qty_low === null ? null : Number(l.qty_low), qty_likely: l.qty_likely === null ? null : Number(l.qty_likely), qty_high: l.qty_high === null ? null : Number(l.qty_high), hours_low: l.hours_low === null ? null : Number(l.hours_low), hours_likely: l.hours_likely === null ? null : Number(l.hours_likely), hours_high: l.hours_high === null ? null : Number(l.hours_high), allocation_pct: Number(l.allocation_pct) }));
  const prog = useMemo(() => estimateProgramme(required.map((w) => w.id), L, contingency), [required, L, contingency]);
  const saveCI = async (patch: Partial<CommercialInputs>) => {
    const { error } = await db.from("commercial_inputs").upsert({ ...(c ?? {}), ...patch, assessment_id: assessment.id, project_id: project.id }, { onConflict: "assessment_id" });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["commercial_inputs", assessment.id] });
  };
  const addLine = async (wp: string) => {
    const { error } = await db.from("estimate_lines").insert({ assessment_id: assessment.id, project_id: project.id, work_package_id: wp, unit_type: "Custom unit", quantity_mode: "exact" });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["estimate_lines", assessment.id] });
  };
  const upd = async (l: EstimateLineRow, patch: Partial<EstimateLineRow>) => {
    const next = { ...l, ...patch };
    const errs = validateLine({ ...next, qty_low: next.qty_low, qty_likely: next.qty_likely, qty_high: next.qty_high } as never);
    if (errs.length) return toast.error(errs.join("; "));
    const { error } = await db.from("estimate_lines").update(patch).eq("id", l.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["estimate_lines", assessment.id] });
  };
  const del = async (id: string) => { await db.from("estimate_lines").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["estimate_lines", assessment.id] }); };
  const applyCatalog = (l: EstimateLineRow, unit: string) => {
    const u = catalog.data?.find((x) => x.unit_type === unit);
    if (u) upd(l, { unit_type: u.label + (u.is_demo ? " (DEMO)" : ""), hours_low: u.hours_low, hours_likely: u.hours_likely, hours_high: u.hours_high, basis: u.is_demo ? "DEMO synthetic catalog value — replace with benchmark" : "Effort catalog" });
  };
  const hrs = prog.total?.likely ?? null;
  const split = c?.role_split ?? {}; const rates = c?.role_rates ?? {};
  const cost = hrs !== null && c?.currency ? roleCost(hrs, split, rates) : null;
  const staff = hrs !== null && c?.hours_per_person_week && c?.target_weeks ? staffing(hrs, Number(c.hours_per_person_week), Number(c.target_weeks)) : null;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const wpName = (id: string) => required.find((w) => w.id === id)?.code ?? id;

  return (
    <div className="mt-4 space-y-5">
      <div className="rounded-md border border-warning/40 bg-warning-soft p-3 text-xs flex gap-2"><Lock className="h-4 w-4" aria-hidden />Internal commercial data. Never included in customer exports. No default rates, offshore %, margin, duration or license cost is assumed.</div>
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label={prog.complete ? "Total hours (L / likely / H)" : "Partial hours — UNESTIMATED work remains"} value={prog.complete && prog.total ? `${fmt(prog.total.low)} / ${fmt(prog.total.likely)} / ${fmt(prog.total.high)}` : `${fmt(prog.partial.likely)}+`} tone={prog.complete ? undefined : "warning"} sub={`Contingency model: ${contingency.model}`} />
        <Stat label="Estimate coverage" value={`${Math.round(prog.coverage * 100)}%`} sub={`${prog.unestimatedPackages.length} required package(s) unestimated`} />
        <Stat label="Proposed headcount" value={staff ? staff.headcount : "N/A"} sub={staff ? `${staff.utilisation}% average utilisation` : "Needs complete total, capacity and weeks"} />
        <Stat label={`Labour cost${c?.currency ? ` (${c.currency})` : ""}`} value={cost?.cost != null ? fmt(cost.cost) : "N/A"} sub={cost?.missing.length ? cost.missing.join("; ") : !c?.currency ? "Set currency, rates and split" : "Excludes licence, tax, travel, contingency cost"} />
      </div>
      {prog.unestimatedPackages.length > 0 && <p className="text-xs text-warning">Unestimated: {prog.unestimatedPackages.map(wpName).join(", ")}</p>}

      <div className="card-elevated p-4 grid md:grid-cols-4 gap-3">
        <h3 className="md:col-span-4 font-semibold text-sm">Commercial & capacity inputs</h3>
        <div><Label>Currency (ISO)</Label><Input defaultValue={c?.currency ?? ""} maxLength={3} placeholder="e.g. USD" onBlur={(e) => { const v = e.target.value.toUpperCase(); if (v === "" || /^[A-Z]{3}$/.test(v)) saveCI({ currency: v || null }); else toast.error("Use a 3-letter currency code"); }} /></div>
        <div><Label>Contingency model</Label><Select value={c?.contingency_model ?? "none"} onValueChange={(v) => saveCI({ contingency_model: v as CommercialInputs["contingency_model"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="percentage">Percentage (applied once)</SelectItem><SelectItem value="risk_hours">Risk-linked hours</SelectItem></SelectContent></Select></div>
        {c?.contingency_model === "percentage" && <div><Label>Contingency %</Label><Input type="number" min={0} max={100} defaultValue={c.contingency_pct ?? ""} onBlur={(e) => saveCI({ contingency_pct: nz(e.target.value) })} /></div>}
        {c?.contingency_model === "risk_hours" && (["risk_hours_low", "risk_hours_likely", "risk_hours_high"] as const).map((k) => <div key={k}><Label>{k.replace("risk_hours_", "Risk hours ")}</Label><Input type="number" min={0} defaultValue={c[k] ?? ""} onBlur={(e) => saveCI({ [k]: nz(e.target.value) })} /></div>)}
        <div><Label>Hours / person / week</Label><Input type="number" min={1} max={80} defaultValue={c?.hours_per_person_week ?? ""} onBlur={(e) => saveCI({ hours_per_person_week: nz(e.target.value) })} /></div>
        <div><Label>Target elapsed weeks</Label><Input type="number" min={1} defaultValue={c?.target_weeks ?? ""} onBlur={(e) => saveCI({ target_weeks: nz(e.target.value) })} /></div>
        <div className="md:col-span-2"><Label>Customer SME / test capacity</Label><Input defaultValue={c?.customer_sme_capacity ?? ""} onBlur={(e) => saveCI({ customer_sme_capacity: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm md:col-span-2"><Switch checked={!!c?.rom_selected} onCheckedChange={(v) => saveCI({ rom_selected: v })} />Use ±20% ROM (requires a justified basis)</label>
        {c?.rom_selected && <div className="md:col-span-2"><Label>ROM basis</Label><Input defaultValue={c.rom_basis} onBlur={(e) => saveCI({ rom_basis: e.target.value })} /></div>}
        <div className="md:col-span-4 overflow-x-auto"><table className="text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="p-1 text-left">Role</th><th className="p-1">Split %</th><th className="p-1">Rate / hour</th></tr></thead><tbody>
          {ROLES.map((r) => <tr key={r}><td className="p-1 pr-4">{r}</td><td className="p-1"><Input className="h-8 w-24" type="number" min={0} max={100} defaultValue={split[r] ?? ""} onBlur={(e) => { const v = { ...split }; if (e.target.value === "") delete v[r]; else v[r] = Number(e.target.value); saveCI({ role_split: v }); }} /></td><td className="p-1"><Input className="h-8 w-28" type="number" min={0} defaultValue={rates[r] ?? ""} onBlur={(e) => { const v = { ...rates }; if (e.target.value === "") delete v[r]; else v[r] = Number(e.target.value); saveCI({ role_rates: v }); }} /></td></tr>)}
        </tbody></table></div>
      </div>

      {required.map((w) => { const pe = estimatePackage(w.id, L); return (
        <div key={w.id} className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-2"><span className="font-mono text-xs">{w.code}</span><h3 className="font-semibold text-sm">{w.name}</h3>
            {pe.complete ? <Pill tone="success">{fmt(pe.base!.low)} / {fmt(pe.base!.likely)} / {fmt(pe.base!.high)} h</Pill> : <Pill tone="warning">Unestimated</Pill>}
            {me.canEditInternal && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => addLine(w.id)}><Plus className="h-3.5 w-3.5 mr-1" />Line</Button>}</div>
          {(lines.data ?? []).filter((l) => l.work_package_id === w.id).map((l) => (
            <div key={l.id} className="grid grid-cols-12 gap-1.5 items-center text-xs mb-1.5">
              <Select onValueChange={(v) => applyCatalog(l, v)}><SelectTrigger className="col-span-2 h-8 text-xs" aria-label="Catalog unit"><SelectValue placeholder={l.unit_type} /></SelectTrigger><SelectContent>{(catalog.data ?? []).map((u) => <SelectItem key={u.unit_type + u.is_demo} value={u.unit_type}>{u.label}{u.is_demo ? " · DEMO" : ""}</SelectItem>)}</SelectContent></Select>
              <Select value={l.quantity_mode} onValueChange={(v) => upd(l, { quantity_mode: v as "exact" })}><SelectTrigger className="col-span-1 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="exact">exact</SelectItem><SelectItem value="band">band</SelectItem></SelectContent></Select>
              {(["qty_low", "qty_likely", "qty_high", "hours_low", "hours_likely", "hours_high"] as const).map((k) => <Input key={k} aria-label={k} title={k} className="col-span-1 h-8 text-xs" type="number" min={0} placeholder={k.replace("_", " ")} defaultValue={l[k] ?? ""} disabled={l.quantity_mode === "exact" && (k === "qty_low" || k === "qty_high")} onBlur={(e) => nz(e.target.value) !== l[k] && upd(l, { [k]: nz(e.target.value) })} />)}
              <Input aria-label="Allocation %" title="Allocation %" className="col-span-1 h-8 text-xs" type="number" min={1} max={100} defaultValue={l.allocation_pct} onBlur={(e) => upd(l, { allocation_pct: Number(e.target.value) })} />
              <Input aria-label="Basis" className="col-span-1 h-8 text-xs" placeholder="basis" defaultValue={l.basis} onBlur={(e) => upd(l, { basis: e.target.value })} />
              <Button size="icon" variant="ghost" className="col-span-1 h-8 w-8" aria-label="Delete line" onClick={() => del(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>))}
          {pe.missing.length > 0 && <p className="text-[11px] text-muted-foreground">{pe.missing.join(" · ")}</p>}
        </div>); })}
    </div>
  );
}

function Narrative() {
  const { assessment, project, me } = useAssessment();
  const qc = useQueryClient();
  const s = useAssessmentTable<{ id: string; section_no: number; body: string; internal_only: boolean; approved: boolean }>("proposal_sections", assessment.id);
  const get = (n: number) => s.data?.find((x) => x.section_no === n);
  const up = async (n: number, patch: Record<string, unknown>) => {
    const cur = get(n);
    const { error } = await db.from("proposal_sections").upsert({ assessment_id: assessment.id, project_id: project.id, section_no: n, body: cur?.body ?? "", internal_only: cur?.internal_only ?? n === 8, approved: cur?.approved ?? false, ...patch }, { onConflict: "assessment_id,section_no" });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["proposal_sections", assessment.id] });
  };
  return (
    <div className="mt-4 space-y-3">
      {SECTIONS.map((t, i) => { const r = get(i + 1); return (
        <div key={i} className="card-elevated p-4">
          <div className="flex flex-wrap items-center gap-3 mb-2"><h3 className="font-semibold text-sm">{i + 1}. {t}</h3>
            {me.canEditInternal && <><label className="flex items-center gap-1.5 text-xs ml-auto"><Switch checked={r?.internal_only ?? i + 1 === 8} onCheckedChange={(v) => up(i + 1, { internal_only: v })} />Internal only</label>
            <label className="flex items-center gap-1.5 text-xs"><Switch checked={!!r?.approved} onCheckedChange={(v) => up(i + 1, { approved: v })} />Approved</label></>}</div>
          <Textarea rows={4} disabled={!me.canEditInternal} defaultValue={r?.body ?? ""} placeholder={i === 11 ? "Generated automatically in exports from requirement → evidence → mapping → finding → work package links. Add commentary here." : "Draft from evidence; link statements to requirement / finding codes."} onBlur={(e) => e.target.value !== (r?.body ?? "") && up(i + 1, { body: e.target.value, approved: false })} />
        </div>); })}
    </div>
  );
}

function Export() {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const [aud, setAud] = useState<Audience>("customer");
  const [com, setCom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const preparePdf = async () => {
    setBusy(true); setPdf(null);
    try {
      const pack = await buildPack(assessment.id, "customer", false);
      setPdf(packToPdf(pack as ProposalDocument, SECTIONS));
      toast.success("Client proposal PDF ready");
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  };
  const go = async (fmt: "html" | "xlsx" | "json") => {
    setBusy(true);
    try {
      const pack = await buildPack(assessment.id, aud, aud === "internal" && com && me.canViewCommercials);
      const base = `${assessment.code}-${aud === "customer" ? "assessment-report" : "INTERNAL-proposal-pack"}`;
      if (fmt === "json") download(`${base}.json`, JSON.stringify(pack, null, 2), "application/json");
      if (fmt === "xlsx") download(`${base}.xlsx`, packToXlsx(pack), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      if (fmt === "html") { const w = window.open("", "_blank"); if (w) { w.document.write(packToHtml(pack, SECTIONS)); w.document.close(); setTimeout(() => w.print(), 400); } else download(`${base}.html`, packToHtml(pack, SECTIONS), "text/html"); }
      await db.from("audit_events").insert({ project_id: project.id, assessment_id: assessment.id, actor: user!.id, action: "export.generated", object_type: "export", object_id: fmt, summary: `${aud} ${fmt} · ${pack.hash.slice(0, 12)}` });
      toast.success("Export generated");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="mt-4 grid lg:grid-cols-2 gap-4">
      <div className="card-elevated p-5 space-y-4">
        <div><Label>Audience</Label><Select value={aud} onValueChange={(v) => setAud(v as Audience)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="customer">Customer assessment report</SelectItem>{me.isInternal && <SelectItem value="internal">Internal proposal pack</SelectItem>}</SelectContent></Select></div>
        {aud === "internal" && me.canViewCommercials && <label className="flex items-center gap-2 text-sm"><Switch checked={com} onCheckedChange={setCom} />Include commercial tables (estimate, rates)</label>}
        <div className="flex flex-wrap gap-2">
          {aud === "customer" && <Button disabled={busy} onClick={preparePdf}><FileText className="h-4 w-4 mr-1" />Prepare client PDF</Button>}
          {pdf && aud === "customer" && <Button variant="outline" onClick={() => deliverProposal(pdf, `${assessment.code}-client-proposal.pdf`)}><Download className="h-4 w-4 mr-1" />Download client PDF</Button>}
          <Button disabled={busy} variant="outline" onClick={() => go("html")}><FileText className="h-4 w-4 mr-1" />Printable report</Button>
          <Button disabled={busy} variant="outline" onClick={() => go("xlsx")}><Download className="h-4 w-4 mr-1" />Workbook (XLSX)</Button>
          <Button disabled={busy} variant="outline" onClick={() => go("json")}><Download className="h-4 w-4 mr-1" />Structured JSON</Button>
        </div>
        <p className="text-xs text-muted-foreground">Every export carries template, rubric and rule versions plus a content hash, and is recorded in history. Spreadsheet cells beginning with = + - @ are neutralised.</p>
      </div>
      <div className="card-elevated p-5">
        <h3 className="font-semibold text-sm mb-2">Audience preview — {aud === "customer" ? "excluded from this export" : "included in this export"}</h3>
        {aud === "customer" ? <ul className="text-sm space-y-1">{CUSTOMER_EXCLUSIONS.map((x) => <li key={x} className="flex gap-2"><Lock className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" aria-hidden />{x}</li>)}</ul>
          : <ul className="text-sm space-y-1"><li>All answers including internal questions</li><li>Internal records, finding wording and internal notes</li><li>All proposal sections (approved and draft)</li><li>{com && me.canViewCommercials ? "Commercial estimate and rates" : "Commercial tables excluded"}</li></ul>}
      </div>
    </div>
  );
}
