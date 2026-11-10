import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { db, must, sha256Hex } from "@/lib/db";
import { buildSnapshotPayload } from "@/lib/analysis";
import type { Snapshot } from "@/lib/models";
import { PageHeader, Pill, EmptyState, fmtDate } from "@/components/app/bits";
import { download } from "@/lib/csv";

const KINDS = [["initial_discovery", "Initial discovery"], ["architect_review", "Architect review"], ["customer_validated", "Customer validated"], ["proposal_baseline", "Proposal baseline"], ["updated_scope", "Updated scope"], ["other", "Other"]];

export function diffSnapshots(a: Record<string, any[]>, b: Record<string, any[]>) {
  const out: { table: string; added: number; removed: number; changed: number }[] = [];
  for (const t of Array.from(new Set([...Object.keys(a), ...Object.keys(b)]))) {
    if (!Array.isArray(a[t]) && !Array.isArray(b[t])) continue;
    const A = new Map((a[t] ?? []).map((r: any) => [r.id, JSON.stringify({ ...r, updated_at: undefined })]));
    const B = new Map((b[t] ?? []).map((r: any) => [r.id, JSON.stringify({ ...r, updated_at: undefined })]));
    let added = 0, removed = 0, changed = 0;
    B.forEach((v, k) => { if (!A.has(k)) added++; else if (A.get(k) !== v) changed++; });
    A.forEach((_, k) => { if (!B.has(k)) removed++; });
    if (added + removed + changed) out.push({ table: t, added, removed, changed });
  }
  return out;
}

export default function History() {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const snaps = useAssessmentTable<Snapshot>("snapshots", assessment.id, { order: "created_at", enabled: me.isInternal });
  const audit = useQuery({ queryKey: ["audit", assessment.id], enabled: me.isInternal, queryFn: () => must<{ id: string; action: string; object_type: string; object_id: string; summary: string; created_at: string; actor: string }[]>(db.from("audit_events").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(300)) });
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [kind, setKind] = useState("architect_review"); const [com, setCom] = useState(false);
  const [a, setA] = useState(""); const [b, setB] = useState(""); const [diff, setDiff] = useState<ReturnType<typeof diffSnapshots> | null>(null);
  if (!me.isInternal) return <EmptyState title="History is internal">Snapshots and the audit trail are visible to the delivery team.</EmptyState>;
  const create = async () => {
    if (!name.trim()) return toast.error("Name the snapshot.");
    const payload = await buildSnapshotPayload(assessment.id, com && me.canViewCommercials);
    const { error } = await db.from("snapshots").insert({ assessment_id: assessment.id, project_id: project.id, kind, name, template_version: assessment.template_version, rubric_version: assessment.rubric_version, rule_version: assessment.rule_version, payload, payload_hash: await sha256Hex(JSON.stringify(payload)), created_by: user!.id });
    if (error) return toast.error(error.message);
    await db.from("audit_events").insert({ project_id: project.id, assessment_id: assessment.id, actor: user!.id, action: "snapshot.created", object_type: "snapshot", object_id: kind, summary: name });
    setOpen(false); setName(""); qc.invalidateQueries({ queryKey: ["snapshots", assessment.id] }); toast.success("Snapshot frozen");
  };
  const compare = () => {
    const sa = snaps.data?.find((s) => s.id === a), sb = snaps.data?.find((s) => s.id === b);
    if (!sa || !sb) return toast.error("Choose two snapshots.");
    setDiff(diffSnapshots(sa.payload, sb.payload));
  };
  return (
    <div>
      <PageHeader kicker="History" title="Snapshots and audit trail" description="Snapshots are immutable and carry template, rubric and rule versions. Later edits never rewrite them." actions={me.canEditInternal && <Button size="sm" onClick={() => setOpen(true)}><Camera className="h-4 w-4 mr-1" />Freeze snapshot</Button>} />
      <Tabs defaultValue="snaps">
        <TabsList><TabsTrigger value="snaps">Snapshots</TabsTrigger><TabsTrigger value="audit">Audit trail</TabsTrigger></TabsList>
        <TabsContent value="snaps">
          <div className="card-elevated p-3 my-3 flex flex-wrap gap-2 items-end">
            <div><Label>From</Label><Select value={a} onValueChange={setA}><SelectTrigger className="w-64"><SelectValue placeholder="Snapshot" /></SelectTrigger><SelectContent>{(snaps.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>To</Label><Select value={b} onValueChange={setB}><SelectTrigger className="w-64"><SelectValue placeholder="Snapshot" /></SelectTrigger><SelectContent>{(snaps.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <Button variant="outline" onClick={compare}><GitCompare className="h-4 w-4 mr-1" />Compare</Button>
          </div>
          {diff && <div className="card-elevated p-3 mb-3 text-sm">{diff.length === 0 ? "No differences." : <table className="w-full"><thead className="text-xs text-muted-foreground"><tr><th className="text-left">Area</th><th>Added</th><th>Removed</th><th>Changed</th></tr></thead><tbody>{diff.map((d) => <tr key={d.table}><td>{d.table}</td><td className="text-center">{d.added}</td><td className="text-center">{d.removed}</td><td className="text-center">{d.changed}</td></tr>)}</tbody></table>}</div>}
          {(snaps.data ?? []).length === 0 ? <EmptyState title="No snapshots yet">Freeze one at each milestone.</EmptyState> : (
            <div className="card-elevated divide-y">{[...(snaps.data ?? [])].reverse().map((s) => (
              <div key={s.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                <Pill tone="navy">{KINDS.find((k) => k[0] === s.kind)?.[1]}</Pill><span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(s.created_at)} · {s.template_version} / {s.rubric_version} / {s.rule_version} · #{s.payload_hash.slice(0, 10)}</span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => download(`${assessment.code}-${s.kind}.json`, JSON.stringify(s.payload, null, 2), "application/json")}>Download</Button>
              </div>))}</div>)}
        </TabsContent>
        <TabsContent value="audit">
          <div className="card-elevated divide-y mt-3">{(audit.data ?? []).map((e) => (
            <div key={e.id} className="p-2.5 text-sm flex gap-3"><span className="text-xs text-muted-foreground w-40 shrink-0">{fmtDate(e.created_at)}</span><span className="font-mono text-xs w-44 shrink-0">{e.action}</span><span className="truncate">{e.summary}</span></div>))}
            {(audit.data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No events yet.</p>}</div>
        </TabsContent>
      </Tabs>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>Freeze snapshot</DialogTitle><DialogDescription>Captures answers, registers, requirements, mappings, findings, scores, strategies, work packages and evidence metadata.</DialogDescription></DialogHeader>
          <Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} />
          <Label>Milestone</Label><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{KINDS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          {me.canViewCommercials && <label className="flex items-center gap-2 text-sm"><Switch checked={com} onCheckedChange={setCom} />Include commercial data</label>}
          <DialogFooter><Button onClick={create}>Freeze</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
