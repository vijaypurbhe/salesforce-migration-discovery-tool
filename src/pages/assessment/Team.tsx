import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAssessment } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { db, must } from "@/lib/db";
import { ROLE_LABEL, type Member, type ProjectRole } from "@/lib/models";
import { MODULES } from "@/domain/questionBank";
import { REGISTERS } from "@/domain/registers";
import { PageHeader, Pill } from "@/components/app/bits";

export default function Team() {
  const { project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members", project.id], queryFn: () => must<Member[]>(db.from("project_members").select("*").eq("project_id", project.id)) });
  const profiles = useQuery({ queryKey: ["member-profiles", project.id], enabled: !!members.data, queryFn: () => must<{ id: string; email: string; display_name: string }[]>(db.from("user_profiles").select("id,email,display_name").in("id", (members.data ?? []).map((m) => m.user_id))) });
  const [edit, setEdit] = useState<{ email: string; role: ProjectRole; com: boolean; modules: string[]; registers: string[] } | null>(null);
  const prof = (id: string) => profiles.data?.find((p) => p.id === id);
  const save = async () => {
    if (!edit?.email.includes("@")) return toast.error("Enter the person's email.");
    const { data, error } = await db.rpc("add_project_member", { p_project: project.id, p_email: edit.email, p_role: edit.role, p_commercials: edit.com, p_modules: edit.modules, p_registers: edit.registers });
    if (error) return toast.error(error.message);
    if (data?.status === "not_found") return toast.error("No account with that email yet. Ask them to sign up first, then add them.");
    setEdit(null); qc.invalidateQueries({ queryKey: ["members", project.id] }); toast.success("Access saved");
  };
  const remove = async (uid: string) => {
    if (!confirm("Remove this person's access to the project?")) return;
    const { error } = await db.rpc("remove_project_member", { p_project: project.id, p_user: uid });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["members", project.id] });
  };
  const customer = (r: ProjectRole) => r === "customer_contributor" || r === "customer_reviewer";
  return (
    <div>
      <PageHeader kicker="Access" title="Project team" description="Access is per project. Customer users only see this customer's customer-visible content; commercial data requires explicit permission."
        actions={me.isLead && <Button size="sm" onClick={() => setEdit({ email: "", role: "customer_contributor", com: false, modules: [], registers: [] })}><UserPlus className="h-4 w-4 mr-1" />Add person</Button>} />
      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b bg-secondary/40 text-left"><tr><th className="p-2.5">Person</th><th className="p-2.5">Role</th><th className="p-2.5">Commercials</th><th className="p-2.5">Assigned modules</th><th className="p-2.5">Registers</th><th /></tr></thead>
          <tbody>{(members.data ?? []).map((m) => (
            <tr key={m.id} className="border-b last:border-0">
              <td className="p-2.5">{prof(m.user_id)?.display_name || "—"}<div className="text-xs text-muted-foreground">{prof(m.user_id)?.email}</div></td>
              <td className="p-2.5"><Pill tone={customer(m.role) ? "info" : "navy"}>{ROLE_LABEL[m.role]}</Pill></td>
              <td className="p-2.5">{m.can_view_commercials ? <Pill tone="warning">yes</Pill> : "no"}</td>
              <td className="p-2.5 text-xs">{m.assigned_modules.join(", ") || "—"}</td>
              <td className="p-2.5 text-xs">{m.assigned_registers.join(", ") || "—"}</td>
              <td className="p-2.5 whitespace-nowrap">{me.isLead && <><Button size="sm" variant="ghost" onClick={() => setEdit({ email: prof(m.user_id)?.email ?? "", role: m.role, com: m.can_view_commercials, modules: m.assigned_modules, registers: m.assigned_registers })}>Edit</Button>
                {m.user_id !== user!.id && <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => remove(m.user_id)}><Trash2 className="h-4 w-4" /></Button>}</>}</td>
            </tr>))}</tbody>
        </table>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Project access</DialogTitle><DialogDescription>The person must already have an account. Customer roles can never view commercials.</DialogDescription></DialogHeader>
          {edit && <div className="space-y-3">
            <div><Label>Email</Label><Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            <div><Label>Role</Label><Select value={edit.role} onValueChange={(v) => setEdit({ ...edit, role: v as ProjectRole, com: customer(v as ProjectRole) ? false : edit.com })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            {!customer(edit.role) && <label className="flex items-center gap-2 text-sm"><Switch checked={edit.com} onCheckedChange={(c) => setEdit({ ...edit, com: c })} />Can view commercial data</label>}
            {edit.role === "customer_contributor" && <>
              <div><Label>Assigned modules</Label><div className="grid grid-cols-3 gap-1 mt-1">{MODULES.map((m) => <label key={m.code} className="flex gap-2 text-xs"><Checkbox checked={edit.modules.includes(m.code)} onCheckedChange={(c) => setEdit({ ...edit, modules: c ? [...edit.modules, m.code] : edit.modules.filter((x) => x !== m.code) })} />{m.code} {m.name}</label>)}</div></div>
              <div><Label>Assigned registers</Label><div className="grid grid-cols-3 gap-1 mt-1">{REGISTERS.map((r) => <label key={r.type} className="flex gap-2 text-xs"><Checkbox checked={edit.registers.includes(r.type)} onCheckedChange={(c) => setEdit({ ...edit, registers: c ? [...edit.registers, r.type] : edit.registers.filter((x) => x !== r.type) })} />{r.label}</label>)}</div></div>
            </>}
          </div>}
          <DialogFooter><Button onClick={save}>Save access</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
