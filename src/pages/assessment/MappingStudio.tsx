import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { DISPOSITIONS, ENTITLEMENT, FIT_STATUSES, type Mapping, type RegisterItem, type Requirement } from "@/lib/models";
import { MAPPING_SEEDS } from "@/domain/mappingSeeds";
import { AXES, CAPABILITY_ANCHORS } from "@/domain/axes";
import { OPTION_SETS } from "@/domain/questionBank";
import { PageHeader, Pill, EmptyState } from "@/components/app/bits";
import { FitPill } from "@/components/app/ToneFit";

export default function MappingStudio() {
  return (
    <div>
      <PageHeader kicker="Mapping studio" title="Business outcome first, artifact second"
        description="Many-to-many: one source feature may map to several target constructs, and several artifacts may consolidate into one requirement. A similar object name is not evidence of equivalent behaviour." />
      <Tabs defaultValue="mappings">
        <TabsList><TabsTrigger value="mappings">Mappings</TabsTrigger><TabsTrigger value="requirements">Requirements & scoring</TabsTrigger></TabsList>
        <TabsContent value="mappings"><Mappings /></TabsContent>
        <TabsContent value="requirements"><Requirements /></TabsContent>
      </Tabs>
    </div>
  );
}

function Mappings() {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const maps = useAssessmentTable<Mapping>("mappings", assessment.id, { order: "code" });
  const reqs = useAssessmentTable<Requirement>("requirements", assessment.id, { order: "code" });
  const regs = useAssessmentTable<RegisterItem>("register_items", assessment.id, { order: "code" });
  const [edit, setEdit] = useState<Partial<Mapping> | null>(null);
  const [filter, setFilter] = useState("all");
  const list = (maps.data ?? []).filter((m) => !m.archived && (filter === "all" || m.fit_status === filter));
  const refresh = () => qc.invalidateQueries({ queryKey: ["mappings", assessment.id] });

  const seed = async () => {
    const have = new Set((maps.data ?? []).map((m) => m.legacy_area));
    const rows = MAPPING_SEEDS.filter(([l]) => !have.has(l)).map(([legacy, target, proof], i) => ({
      assessment_id: assessment.id, project_id: project.id, code: `MAP-${String((maps.data?.length ?? 0) + i + 1).padStart(3, "0")}`,
      legacy_area: legacy, candidate_target: target, discovery_proof: proof, fit_status: "validation_pending", is_seed_prompt: true, created_by: user!.id,
    }));
    if (!rows.length) return toast.info("All candidate prompts are already present.");
    const { error } = await db.from("mappings").insert(rows);
    if (error) toast.error(error.message); else { toast.success(`${rows.length} candidate prompts added (validation pending)`); refresh(); }
  };
  const save = async () => {
    if (!edit?.legacy_area) return toast.error("Legacy area is required.");
    const p: Record<string, unknown> = { ...edit };
    ["id", "assessment_id", "project_id", "created_at", "updated_at", "created_by"].forEach((k) => delete p[k]);
    if (p.fit_status === "verified_native_fit" && !edit.verified_by) { p.verified_by = user!.id; p.verified_at = new Date().toISOString(); }
    const res = edit.id ? await db.from("mappings").update(p).eq("id", edit.id) : await db.from("mappings").insert({ ...p, code: p.code || `MAP-${String((maps.data?.length ?? 0) + 1).padStart(3, "0")}`, assessment_id: assessment.id, project_id: project.id, created_by: user!.id });
    if (res.error) return toast.error(res.error.message);
    setEdit(null); refresh();
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-60" aria-label="Fit status filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All fit statuses</SelectItem>{FIT_STATUSES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select>
        {me.canEditInternal && <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={seed}><Sparkles className="h-4 w-4 mr-1" />Add 29 candidate mapping prompts</Button>
          <Button size="sm" onClick={() => setEdit({ fit_status: "validation_pending", entitlement_status: "unconfirmed", disposition: "unresolved", requirement_ids: [], artifact_ids: [], scenario_ids: [] })}><Plus className="h-4 w-4 mr-1" />New mapping</Button>
        </div>}
      </div>
      {list.length === 0 ? <EmptyState title="No mappings yet">Start from the editable candidate prompts — they are design starting points, not verified mappings.</EmptyState> : (
        <div className="card-elevated overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="text-left text-xs text-muted-foreground border-b bg-secondary/40"><tr><th className="p-2.5">ID</th><th className="p-2.5">Legacy area</th><th className="p-2.5">Candidate target / design direction</th><th className="p-2.5">Disposition</th><th className="p-2.5">Fit status</th><th className="p-2.5">Entitlement</th><th className="p-2.5">Links</th><th /></tr></thead>
            <tbody>{list.map((m) => (
              <tr key={m.id} className="border-b last:border-0 align-top">
                <td className="p-2.5 font-mono text-xs">{m.code}</td>
                <td className="p-2.5 font-medium">{m.legacy_area}{m.is_seed_prompt && <div><Pill tone="outline">candidate prompt</Pill></div>}</td>
                <td className="p-2.5 text-xs">{m.candidate_target}<div className="text-muted-foreground mt-1">Proof needed: {m.discovery_proof}</div>{m.target_api_names && <div className="mt-1 font-mono">{m.target_api_names} {m.api_names_validated ? <Pill tone="success">validated</Pill> : <Pill tone="warning">hypothesis</Pill>}</div>}</td>
                <td className="p-2.5 text-xs">{m.disposition}</td>
                <td className="p-2.5"><FitPill v={m.fit_status} /></td>
                <td className="p-2.5"><Pill tone={m.entitlement_status === "purchased" ? "success" : "warning"}>{m.entitlement_status.replace("_", " ")}</Pill></td>
                <td className="p-2.5 text-xs">{m.requirement_ids.length} req · {m.artifact_ids.length} artifacts</td>
                <td className="p-2.5">{me.canEditInternal && <Button size="sm" variant="ghost" onClick={() => setEdit(m)}>Edit</Button>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.code ?? "New mapping"}</DialogTitle><DialogDescription>Candidate fit, entitlement evidence and architect verification are kept separate. “Verified native fit” requires a purchased entitlement and a validation date, and records you as verifier.</DialogDescription></DialogHeader>
          {edit && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Legacy area</Label><Input value={edit.legacy_area ?? ""} onChange={(e) => setEdit({ ...edit, legacy_area: e.target.value })} /></div>
              <div><Label>Domain</Label><Input value={edit.domain ?? ""} onChange={(e) => setEdit({ ...edit, domain: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Candidate target capability / design</Label><Textarea value={edit.candidate_target ?? ""} onChange={(e) => setEdit({ ...edit, candidate_target: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Required discovery proof</Label><Textarea value={edit.discovery_proof ?? ""} onChange={(e) => setEdit({ ...edit, discovery_proof: e.target.value })} /></div>
              <div><Label>Target object / field / API names (hypothesis)</Label><Input value={edit.target_api_names ?? ""} onChange={(e) => setEdit({ ...edit, target_api_names: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm mt-6"><Checkbox checked={!!edit.api_names_validated} onCheckedChange={(c) => setEdit({ ...edit, api_names_validated: !!c })} />API names validated against chosen release</label>
              <div><Label>Source disposition</Label><Select value={edit.disposition ?? "unresolved"} onValueChange={(v) => setEdit({ ...edit, disposition: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DISPOSITIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Fit status</Label><Select value={edit.fit_status ?? "validation_pending"} onValueChange={(v) => setEdit({ ...edit, fit_status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FIT_STATUSES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Entitlement status</Label><Select value={edit.entitlement_status ?? "unconfirmed"} onValueChange={(v) => setEdit({ ...edit, entitlement_status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENTITLEMENT.map((d) => <SelectItem key={d} value={d}>{d.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Release / availability</Label><Input value={edit.release_availability ?? ""} onChange={(e) => setEdit({ ...edit, release_availability: e.target.value })} /></div>
              <div><Label>Validation date</Label><Input type="date" value={edit.validation_date ?? ""} onChange={(e) => setEdit({ ...edit, validation_date: e.target.value || null })} /></div>
              <div><Label>Proof-of-concept result</Label><Input value={edit.poc_result ?? ""} onChange={(e) => setEdit({ ...edit, poc_result: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Architect rationale</Label><Textarea value={edit.architect_rationale ?? ""} onChange={(e) => setEdit({ ...edit, architect_rationale: e.target.value })} /></div>
              <div><Label>Gap category</Label><Input value={edit.gap_category ?? ""} onChange={(e) => setEdit({ ...edit, gap_category: e.target.value })} /></div>
              <div><Label>Business impact</Label><Input value={edit.business_impact ?? ""} onChange={(e) => setEdit({ ...edit, business_impact: e.target.value })} /></div>
              <LinkPicker label="Linked requirements" options={(reqs.data ?? []).map((r) => ({ id: r.id, label: `${r.code} ${r.title}` }))} value={edit.requirement_ids ?? []} onChange={(v) => setEdit({ ...edit, requirement_ids: v })} />
              <LinkPicker label="Linked source artifacts / scenarios" options={(regs.data ?? []).map((r) => ({ id: r.id, label: `${r.code} ${r.title}` }))} value={edit.artifact_ids ?? []} onChange={(v) => setEdit({ ...edit, artifact_ids: v })} />
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save mapping</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinkPicker({ label, options, value, onChange }: { label: string; options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="sm:col-span-1">
      <Label>{label}</Label>
      <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
        {options.length === 0 && <p className="text-xs text-muted-foreground">None available yet.</p>}
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-xs"><Checkbox checked={value.includes(o.id)} onCheckedChange={(c) => onChange(c ? [...value, o.id] : value.filter((x) => x !== o.id))} />{o.label}</label>
        ))}
      </div>
    </div>
  );
}

function Requirements() {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const reqs = useAssessmentTable<Requirement>("requirements", assessment.id, { order: "code" });
  const [edit, setEdit] = useState<Partial<Requirement> | null>(null);
  const list = (reqs.data ?? []).filter((r) => !r.archived);
  const save = async () => {
    if (!edit?.title) return toast.error("Title is required.");
    const p: Record<string, unknown> = { ...edit };
    ["id", "assessment_id", "project_id", "created_at", "updated_at", "created_by"].forEach((k) => delete p[k]);
    if (edit.score_reviewed) p.reviewed_by = user!.id;
    const res = edit.id ? await db.from("requirements").update(p).eq("id", edit.id) : await db.from("requirements").insert({ ...p, code: p.code || `REQ-${String((reqs.data?.length ?? 0) + 1).padStart(3, "0")}`, assessment_id: assessment.id, project_id: project.id, created_by: user!.id });
    if (res.error) return toast.error(res.error.message);
    setEdit(null); qc.invalidateQueries({ queryKey: ["requirements", assessment.id] });
  };
  const num = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className="mt-4">
      <div className="flex justify-between mb-3"><p className="text-sm text-muted-foreground max-w-3xl">Set required capability T and evidenced current capability C (0–5). Weight: Must 3, Should 2, Could 1. Missing scores stay empty — never zero.</p>
        {me.canEditInternal && <Button size="sm" onClick={() => setEdit({ priority: "must", axis: 1, applicability: "applicable", scope: "In initial migration", requirement_type: "Functional", current_score: null, target_score: null, linked_question_ids: [] })}><Plus className="h-4 w-4 mr-1" />New requirement</Button>}</div>
      {list.length === 0 ? <EmptyState title="No requirements yet">Requirements drive the capability spider and work packages.</EmptyState> : (
        <div className="card-elevated overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-left text-xs text-muted-foreground border-b bg-secondary/40"><tr><th className="p-2.5">ID</th><th className="p-2.5">Requirement</th><th className="p-2.5">Axis</th><th className="p-2.5">Priority</th><th className="p-2.5">C</th><th className="p-2.5">T</th><th className="p-2.5">Gap</th><th className="p-2.5">Reviewed</th><th className="p-2.5">Applicability</th><th /></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-2.5 font-mono text-xs">{r.code}</td>
                <td className="p-2.5">{r.title}{r.critical && <Pill tone="destructive" className="ml-1">critical</Pill>}<div className="text-xs text-muted-foreground">{r.scope}</div></td>
                <td className="p-2.5 text-xs">{AXES[r.axis - 1]?.short}</td>
                <td className="p-2.5 text-xs capitalize">{r.priority}</td>
                <td className="p-2.5">{r.current_score ?? "—"}</td><td className="p-2.5">{r.target_score ?? "—"}</td>
                <td className="p-2.5">{r.current_score !== null && r.target_score !== null ? Math.max(r.target_score - r.current_score, 0) : "—"}</td>
                <td className="p-2.5">{r.score_reviewed ? <Pill tone="teal">reviewed</Pill> : <Pill tone="muted">no</Pill>}</td>
                <td className="p-2.5"><Pill tone={r.applicability === "applicable" ? "outline" : "warning"}>{r.applicability.replace("_", " ")}</Pill></td>
                <td className="p-2.5">{me.canEditInternal && <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>Edit</Button>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.code ?? "New requirement"}</DialogTitle></DialogHeader>
          {edit && <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Title</Label><Input value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
            <div><Label>Type</Label><Select value={edit.requirement_type} onValueChange={(v) => setEdit({ ...edit, requirement_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPTION_SETS.REQUIREMENT.options.map((o) => <SelectItem key={o.value} value={o.label}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Primary axis</Label><Select value={String(edit.axis)} onValueChange={(v) => setEdit({ ...edit, axis: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{AXES.map((a) => <SelectItem key={a.no} value={String(a.no)}>{a.no}. {a.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Priority</Label><Select value={edit.priority} onValueChange={(v) => setEdit({ ...edit, priority: v as Requirement["priority"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="must">Must (W=3)</SelectItem><SelectItem value="should">Should (W=2)</SelectItem><SelectItem value="could">Could (W=1)</SelectItem><SelectItem value="out">Out of scope</SelectItem></SelectContent></Select></div>
            <div><Label>Applicability</Label><Select value={edit.applicability} onValueChange={(v) => setEdit({ ...edit, applicability: v as Requirement["applicability"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="applicable">Applicable</SelectItem><SelectItem value="unresolved">Unresolved</SelectItem><SelectItem value="not_applicable">Not applicable</SelectItem></SelectContent></Select></div>
            <div><Label>Scope / wave</Label><Select value={edit.scope} onValueChange={(v) => setEdit({ ...edit, scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPTION_SETS.SCOPE.options.map((o) => <SelectItem key={o.value} value={o.label}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <label className="flex items-center gap-2 text-sm mt-6"><Checkbox checked={!!edit.critical} onCheckedChange={(c) => setEdit({ ...edit, critical: !!c })} />Critical requirement</label>
            <div><Label>Current capability C (0–5)</Label><Select value={edit.current_score === null || edit.current_score === undefined ? "none" : String(edit.current_score)} onValueChange={(v) => setEdit({ ...edit, current_score: v === "none" ? null : num(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not assessed</SelectItem>{CAPABILITY_ANCHORS.map((a, i) => <SelectItem key={i} value={String(i)}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Required capability T (0–5)</Label><Select value={edit.target_score === null || edit.target_score === undefined ? "none" : String(edit.target_score)} onValueChange={(v) => setEdit({ ...edit, target_score: v === "none" ? null : num(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not assessed</SelectItem>{CAPABILITY_ANCHORS.map((a, i) => <SelectItem key={i} value={String(i)}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Validated proposed design coverage (0–5, optional)</Label><Select value={edit.proposed_coverage === null || edit.proposed_coverage === undefined ? "none" : String(edit.proposed_coverage)} onValueChange={(v) => setEdit({ ...edit, proposed_coverage: v === "none" ? null : num(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not assessed</SelectItem>{CAPABILITY_ANCHORS.map((a, i) => <SelectItem key={i} value={String(i)}>{a}</SelectItem>)}</SelectContent></Select></div>
            <label className="flex items-center gap-2 text-sm mt-6"><Checkbox checked={!!edit.score_reviewed} onCheckedChange={(c) => setEdit({ ...edit, score_reviewed: !!c })} />Scores reviewed by architect</label>
            <div className="sm:col-span-2"><Label>Score rationale / evidence</Label><Textarea value={edit.score_rationale ?? ""} onChange={(e) => setEdit({ ...edit, score_rationale: e.target.value })} /></div>
            <div><Label>Current behaviour</Label><Textarea value={edit.current_behavior ?? ""} onChange={(e) => setEdit({ ...edit, current_behavior: e.target.value })} /></div>
            <div><Label>Required future behaviour</Label><Textarea value={edit.future_behavior ?? ""} onChange={(e) => setEdit({ ...edit, future_behavior: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Acceptance criteria</Label><Textarea value={edit.acceptance_criteria ?? ""} onChange={(e) => setEdit({ ...edit, acceptance_criteria: e.target.value })} /></div>
            <div><Label>Linked questions</Label><Input value={(edit.linked_question_ids ?? []).join(", ")} onChange={(e) => setEdit({ ...edit, linked_question_ids: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) })} /></div>
            <div><Label>Visibility</Label><Select value={edit.visibility ?? "customer"} onValueChange={(v) => setEdit({ ...edit, visibility: v as "customer" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="customer">Customer-visible</SelectItem><SelectItem value="internal">Internal</SelectItem></SelectContent></Select></div>
          </div>}
          <DialogFooter><Button onClick={save}>Save requirement</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
