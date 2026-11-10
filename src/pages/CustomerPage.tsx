import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db, must } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import { DemoBadge, PageHeader, Pill, fmtDate } from "@/components/app/bits";
import { STAGES, type Assessment, type Customer, type Project } from "@/lib/models";
import { CreateAssessmentDialog } from "@/components/app/CreateAssessmentDialog";

export default function CustomerPage() {
  const { customerId } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const c = await must<Customer>(db.from("customers").select("*").eq("id", customerId).single());
      const ps = await must<Project[]>(db.from("projects").select("*").eq("customer_id", customerId));
      const as = ps.length ? await must<Assessment[]>(db.from("assessments").select("*").in("project_id", ps.map((p) => p.id)).order("created_at")) : [];
      const ms = ps.length ? await must<{ project_id: string; role: string }[]>(db.from("project_members").select("project_id,role").eq("user_id", user!.id).in("project_id", ps.map((p) => p.id))) : [];
      return { c, ps, as, ms };
    },
  });
  const [form, setForm] = useState<Partial<Customer>>({});
  useEffect(() => { if (q.data) setForm(q.data.c); }, [q.data]);
  if (q.isLoading) return <div className="container py-8 text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="container py-8 text-destructive">Customer not found or not accessible.</div>;
  const { c, ps, as, ms } = q.data;
  const isLead = (pid: string) => ms.some((m) => m.project_id === pid && m.role === "engagement_lead");
  const canEditCustomer = ps.some((p) => isLead(p.id));

  const save = async () => {
    const { error } = await db.from("customers").update({ name: form.name, industry: form.industry, region: form.region, description: form.description }).eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Customer profile saved"); qc.invalidateQueries({ queryKey: ["customer", customerId] }); }
  };
  const newVersion = async (p: Project) => {
    const n = as.filter((a) => a.project_id === p.id).length + 1;
    const { error } = await db.from("assessments").insert({ project_id: p.id, name: `Assessment v${n}`, created_by: user!.id });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["customer", customerId] });
  };

  return (
    <div className="container py-8">
      <PageHeader kicker={`Customer workspace · ${c.code}`} title={c.name} description={<span className="flex gap-2 items-center">{c.industry || "Industry not set"} · {c.region || "Region not set"} {c.is_demo && <DemoBadge />}</span>} />
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          {ps.map((p) => (
            <section key={p.id} className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <div><h2 className="font-bold">{p.name}</h2><p className="text-xs text-muted-foreground font-mono">{p.code}</p></div>
                {isLead(p.id) && !p.is_demo && <Button size="sm" variant="outline" onClick={() => newVersion(p)}><Plus className="h-4 w-4 mr-1" />New assessment version</Button>}
              </div>
              <ul className="mt-4 divide-y">
                {as.filter((a) => a.project_id === p.id).map((a) => (
                  <li key={a.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1"><Link to={`/a/${a.id}`} className="font-medium hover:underline">{a.name}</Link><div className="text-xs text-muted-foreground">{a.code} · template {a.template_version} · created {fmtDate(a.created_at)}</div></div>
                    <Pill tone="teal">{STAGES.find((s) => s.value === a.stage)?.label}</Pill>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!c.is_demo && <CreateAssessmentDialog presetCustomerId={c.id} trigger={<Button variant="outline"><Plus className="h-4 w-4 mr-1" />New project for this customer</Button>} />}
        </div>
        <aside className="card-elevated p-5 space-y-3 h-fit">
          <h2 className="font-bold">Customer profile</h2>
          <div><Label htmlFor="n">Name</Label><Input id="n" disabled={!canEditCustomer} value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label htmlFor="i">Industry</Label><Input id="i" disabled={!canEditCustomer} value={form.industry ?? ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
          <div><Label htmlFor="r">Region</Label><Input id="r" disabled={!canEditCustomer} value={form.region ?? ""} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
          <div><Label htmlFor="d">Description</Label><Textarea id="d" disabled={!canEditCustomer} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {canEditCustomer && <Button onClick={save}>Save profile</Button>}
        </aside>
      </div>
    </div>
  );
}
