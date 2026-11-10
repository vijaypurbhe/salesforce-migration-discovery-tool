import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { db, must } from "@/lib/db";
import { PageHeader, Pill, EmptyState } from "@/components/app/bits";
import { QUESTIONS, MODULES, TEMPLATE_VERSION } from "@/domain/questionBank";
import { RULE_VERSION } from "@/domain/rules";
import { RUBRIC_VERSION } from "@/domain/axes";

interface Unit { id: string; version: string; unit_type: string; label: string; hours_low: number | null; hours_likely: number | null; hours_high: number | null; benchmark_ref: string; is_demo: boolean }
interface Src { id: string; title: string; url: string; provider: string; checked_date: string; guidance: string }

export default function Admin() {
  const { isAdmin, isInternal } = useAuth();
  if (!isInternal && !isAdmin) return <div className="p-8"><EmptyState title="Workspace settings are internal">Only delivery-team staff can view these settings.</EmptyState></div>;
  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto">
      <PageHeader kicker="Workspace" title="Settings and reference data" description={`Template ${TEMPLATE_VERSION} · ${RUBRIC_VERSION} · ${RULE_VERSION}. ${QUESTIONS.length} questions across ${MODULES.length} modules.`} />
      <Tabs defaultValue="catalog">
        <TabsList><TabsTrigger value="catalog">Unit-effort catalog</TabsTrigger><TabsTrigger value="sources">Source references</TabsTrigger>{isAdmin && <TabsTrigger value="staff">Internal staff</TabsTrigger>}</TabsList>
        <TabsContent value="catalog"><Catalog editable={isAdmin} /></TabsContent>
        <TabsContent value="sources"><Sources editable={isAdmin} /></TabsContent>
        {isAdmin && <TabsContent value="staff"><Staff /></TabsContent>}
      </Tabs>
    </div>
  );
}

function Catalog({ editable }: { editable: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["effort_catalog"], queryFn: () => must<Unit[]>(db.from("effort_catalog").select("*").order("is_demo").order("label")) });
  const upd = async (u: Unit, patch: Partial<Unit>) => {
    const n = { ...u, ...patch };
    if ([n.hours_low, n.hours_likely, n.hours_high].some((x) => x !== null && x < 0)) return toast.error("Hours must be zero or more.");
    if (n.hours_low !== null && n.hours_likely !== null && n.hours_low > n.hours_likely || n.hours_likely !== null && n.hours_high !== null && n.hours_likely > n.hours_high) return toast.error("Low ≤ likely ≤ high.");
    const { error } = await db.from("effort_catalog").update(patch).eq("id", u.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["effort_catalog"] });
  };
  const nz = (s: string) => (s === "" ? null : Number(s));
  return (
    <div className="card-elevated overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b bg-secondary/40 text-left"><tr><th className="p-2.5">Unit</th><th className="p-2.5">Version</th><th className="p-2.5">Low h</th><th className="p-2.5">Likely h</th><th className="p-2.5">High h</th><th className="p-2.5">Benchmark / evidence</th></tr></thead>
        <tbody>{(q.data ?? []).map((u) => (
          <tr key={u.id} className="border-b last:border-0">
            <td className="p-2.5">{u.label} {u.is_demo && <Pill tone="demo">DEMO</Pill>}</td><td className="p-2.5 text-xs">{u.version}</td>
            {(["hours_low", "hours_likely", "hours_high"] as const).map((k) => <td key={k} className="p-2.5"><Input aria-label={`${u.label} ${k}`} className="h-8 w-24" type="number" min={0} disabled={!editable} defaultValue={u[k] ?? ""} placeholder="unset" onBlur={(e) => nz(e.target.value) !== u[k] && upd(u, { [k]: nz(e.target.value) })} /></td>)}
            <td className="p-2.5"><Input className="h-8" disabled={!editable} defaultValue={u.benchmark_ref} onBlur={(e) => e.target.value !== u.benchmark_ref && upd(u, { benchmark_ref: e.target.value })} /></td>
          </tr>))}</tbody>
      </table>
      <p className="text-xs text-muted-foreground p-3">Real rows start unset. DEMO rows are synthetic and apply only to demonstration projects.</p>
    </div>
  );
}

function Sources({ editable }: { editable: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["source_references"], queryFn: () => must<Src[]>(db.from("source_references").select("*").order("id")) });
  const upd = async (s: Src, patch: Partial<Src>) => { const { error } = await db.from("source_references").update(patch).eq("id", s.id); if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["source_references"] }); };
  return (
    <div className="space-y-2 mt-4">
      {(q.data ?? []).map((s) => (
        <div key={s.id} className="card-elevated p-3 grid md:grid-cols-12 gap-2 items-start text-sm">
          <div className="md:col-span-1 font-mono text-xs">{s.id}</div>
          <div className="md:col-span-6"><a href={s.url} target="_blank" rel="noreferrer noopener" className="font-medium text-teal hover:underline inline-flex gap-1 items-center">{s.title}<ExternalLink className="h-3 w-3" /></a><p className="text-xs text-muted-foreground">{s.guidance}</p></div>
          <div className="md:col-span-2 text-xs">{s.provider}</div>
          <div className="md:col-span-3"><Label className="text-xs">Checked</Label><Input type="date" className="h-8" disabled={!editable} defaultValue={s.checked_date} onBlur={(e) => e.target.value && e.target.value !== s.checked_date && upd(s, { checked_date: e.target.value })} /></div>
        </div>))}
    </div>
  );
}

function Staff() {
  const [email, setEmail] = useState("");
  const act = async (on: boolean) => {
    const { data, error } = await db.rpc("set_internal_staff", { p_email: email, p_enabled: on });
    if (error) return toast.error(error.message);
    if (data?.status === "not_found") return toast.error("No account with that email.");
    toast.success(on ? "Internal access granted" : "Internal access removed");
  };
  return (
    <div className="card-elevated p-5 mt-4 max-w-lg space-y-3">
      <p className="text-sm text-muted-foreground">Internal staff can create customers and projects. Project access is still granted per project.</p>
      <Label htmlFor="se">Email</Label><Input id="se" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="flex gap-2"><Button onClick={() => act(true)}>Grant internal access</Button><Button variant="outline" onClick={() => act(false)}>Remove</Button></div>
    </div>
  );
}
