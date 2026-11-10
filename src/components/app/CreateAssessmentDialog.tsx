import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, must } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import type { Customer } from "@/lib/models";

export function CreateAssessmentDialog({ trigger, presetCustomerId }: { trigger: React.ReactNode; presetCustomerId?: string }) {
  const { user, isInternal } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string>(presetCustomerId ?? "new");
  const [cName, setCName] = useState(""); const [industry, setIndustry] = useState(""); const [region, setRegion] = useState("");
  const [pName, setPName] = useState("CPQ to Revenue Cloud assessment");
  const [aName, setAName] = useState("Initial discovery");
  const [target, setTarget] = useState("Revenue Cloud");
  const [busy, setBusy] = useState(false);
  const customers = useQuery({ queryKey: ["customers-own"], enabled: open, queryFn: () => must<Customer[]>(db.from("customers").select("*").eq("is_demo", false).eq("created_by", user!.id).order("name")) });

  const create = async () => {
    if (!isInternal) { toast.error("Only internal team members can create assessments."); return; }
    if (customerId === "new" && !cName.trim()) { toast.error("Enter the customer name."); return; }
    setBusy(true);
    try {
      let cid = customerId;
      if (cid === "new") {
        const c = await must<Customer>(db.from("customers").insert({ name: cName.trim(), industry, region, created_by: user!.id }).select().single());
        cid = c.id;
      }
      const p = await must<{ id: string }>(db.from("projects").insert({ customer_id: cid, name: pName.trim() || "Assessment project", created_by: user!.id }).select("id").single());
      const a = await must<{ id: string }>(db.from("assessments").insert({ project_id: p.id, name: aName.trim() || "Initial discovery", target_product_name: target, created_by: user!.id }).select("id").single());
      await db.from("audit_events").insert({ project_id: p.id, assessment_id: a.id, actor: user!.id, action: "assessment.created", object_type: "assessment", object_id: a.id, summary: `Created ${aName}` });
      qc.invalidateQueries();
      setOpen(false);
      nav(`/a/${a.id}/discovery`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create customer assessment</DialogTitle>
          <DialogDescription>Starts empty — no answers are prefilled and no source data is invented.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ New customer</SelectItem>
                {(customers.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {customerId === "new" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label htmlFor="cn">Customer name</Label><Input id="cn" value={cName} onChange={(e) => setCName(e.target.value)} /></div>
              <div><Label htmlFor="ci">Industry</Label><Input id="ci" value={industry} onChange={(e) => setIndustry(e.target.value)} /></div>
              <div><Label htmlFor="cr">Region</Label><Input id="cr" value={region} onChange={(e) => setRegion(e.target.value)} /></div>
            </div>
          )}
          <div><Label htmlFor="pn">Project name</Label><Input id="pn" value={pName} onChange={(e) => setPName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="an">Assessment name</Label><Input id="an" value={aName} onChange={(e) => setAName(e.target.value)} /></div>
            <div><Label htmlFor="tp">Target product name</Label><Input id="tp" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">The product name is a label only. Record the actual SKU, entitlement and release in the licensing section (L03).</p>
        </div>
        <DialogFooter><Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create and start quick start"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
