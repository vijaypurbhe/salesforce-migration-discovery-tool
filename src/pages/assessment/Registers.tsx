import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileUp, Plus, Search, ExternalLink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import { REGISTERS, registerDef, type RegisterDef } from "@/domain/registers";
import type { Evidence, RegisterItem } from "@/lib/models";
import { db } from "@/lib/db";
import { download, parseCsv, toCsv } from "@/lib/csv";
import { PageHeader, Pill, fmtDate, EmptyState } from "@/components/app/bits";
import { EvidenceUpload, openEvidence } from "@/components/discovery/EvidenceUpload";
import { CommentsSheet } from "@/components/discovery/QuestionActions";

export default function Registers() {
  const { assessment } = useAssessment();
  const items = useAssessmentTable<RegisterItem>("register_items", assessment.id, { order: "code" });
  const [tab, setTab] = useState("catalog");
  return (
    <div>
      <PageHeader kicker="Inventories & evidence" title="Registers and source files" description="Structured inventories linked to question IDs. A file upload alone does not count as an analysed inventory." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {REGISTERS.map((r) => <TabsTrigger key={r.type} value={r.type}>{r.label} <span className="ml-1 text-xs text-muted-foreground">{(items.data ?? []).filter((i) => i.register_type === r.type && !i.archived).length}</span></TabsTrigger>)}
          <TabsTrigger value="evidence">Evidence files</TabsTrigger>
        </TabsList>
        {REGISTERS.map((r) => <TabsContent key={r.type} value={r.type}><RegisterTable def={r} rows={(items.data ?? []).filter((i) => i.register_type === r.type)} /></TabsContent>)}
        <TabsContent value="evidence"><EvidenceList /></TabsContent>
      </Tabs>
    </div>
  );
}

function RegisterTable({ def, rows }: { def: RegisterDef; rows: RegisterItem[] }) {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState(""); const [showArchived, setShowArchived] = useState(false);
  const [cols, setCols] = useState<string[]>(def.fields.slice(0, 5).map((f) => f.key));
  const [edit, setEdit] = useState<Partial<RegisterItem> | null>(null);
  const [importRows, setImportRows] = useState<{ rows: Record<string, string>[]; errors: string[] } | null>(null);
  const canWrite = me.canWriteRegister(def.type);
  const list = useMemo(() => rows.filter((r) => (showArchived || !r.archived) && (!q || [r.code, r.title, ...Object.values(r.data ?? {})].join(" ").toLowerCase().includes(q.toLowerCase()))), [rows, q, showArchived]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["register_items", assessment.id] });
  const nextCode = () => `${def.prefix}-${String(rows.length + 1).padStart(3, "0")}`;

  const save = async () => {
    if (!edit?.title?.trim()) return toast.error("Title is required.");
    const payload = { title: edit.title, code: edit.code || nextCode(), data: edit.data ?? {}, status: edit.status ?? "open", visibility: edit.visibility ?? "customer", linked_question_ids: edit.linked_question_ids ?? def.questions.slice(0, 1), updated_by: user!.id };
    const res = edit.id
      ? await db.from("register_items").update({ ...payload, row_version: (edit.row_version ?? 1) + 1 }).eq("id", edit.id).eq("row_version", edit.row_version ?? 1).select()
      : await db.from("register_items").insert({ ...payload, assessment_id: assessment.id, project_id: project.id, register_type: def.type, created_by: user!.id }).select();
    if (res.error) return toast.error(res.error.message);
    if (edit.id && !res.data?.length) return toast.error("This record changed since you opened it. Close and reopen to see the latest version.");
    await db.from("audit_events").insert({ project_id: project.id, assessment_id: assessment.id, actor: user!.id, action: edit.id ? "register.updated" : "register.created", object_type: def.type, object_id: payload.code, summary: payload.title });
    setEdit(null); refresh();
  };
  const archive = async (r: RegisterItem) => { await db.from("register_items").update({ archived: !r.archived }).eq("id", r.id); refresh(); };
  const review = async (r: RegisterItem, s: string) => { await db.from("register_items").update({ review_status: s }).eq("id", r.id); refresh(); };

  const template = () => download(`${def.type}-template.csv`, toCsv([], ["code", "title", ...def.fields.map((f) => f.key)]));
  const exportCsv = () => download(`${assessment.code}-${def.type}.csv`, toCsv(list.map((r) => ({ code: r.code, title: r.title, status: r.status, review_status: r.review_status, visibility: r.visibility, ...r.data })), ["code", "title", "status", "review_status", "visibility", ...def.fields.map((f) => f.key)]));
  const onFile = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) return toast.error("Import files must be 5 MB or smaller. Split larger inventories.");
    const grid = parseCsv(await f.text());
    if (!grid.length) return toast.error("Empty file");
    const head = grid[0].map((h) => h.trim());
    const errors: string[] = [];
    if (!head.includes("title")) errors.push("Missing required column: title");
    const known = new Set(["code", "title", ...def.fields.map((x) => x.key)]);
    head.filter((h) => !known.has(h)).forEach((h) => errors.push(`Unknown column ignored: ${h}`));
    const parsed = grid.slice(1).map((r, i) => {
      const o: Record<string, string> = {}; head.forEach((h, j) => { if (known.has(h)) o[h] = (r[j] ?? "").trim(); });
      if (!o.title) errors.push(`Row ${i + 2}: title is empty`);
      return o;
    }).filter((o) => o.title);
    setImportRows({ rows: parsed.slice(0, 5000), errors });
  };
  const commitImport = async () => {
    if (!importRows) return;
    const existing = new Map(rows.map((r) => [r.code, r]));
    let n = rows.length, inserted = 0, updated = 0;
    for (const r of importRows.rows) {
      const { code, title, ...data } = r;
      const ex = code ? existing.get(code) : undefined;
      if (ex) { await db.from("register_items").update({ title, data: { ...ex.data, ...data }, updated_by: user!.id, row_version: ex.row_version + 1 }).eq("id", ex.id); updated++; }
      else { n++; await db.from("register_items").insert({ assessment_id: assessment.id, project_id: project.id, register_type: def.type, code: code || `${def.prefix}-${String(n).padStart(3, "0")}`, title, data, linked_question_ids: def.questions.slice(0, 1), created_by: user!.id }); inserted++; }
    }
    toast.success(`Imported: ${inserted} new, ${updated} updated by stable ID`); setImportRows(null); refresh();
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative"><Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden /><Input aria-label={`Search ${def.label}`} className="pl-8 w-64" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm">Columns</Button></DropdownMenuTrigger>
          <DropdownMenuContent>{def.fields.map((f) => <DropdownMenuCheckboxItem key={f.key} checked={cols.includes(f.key)} onCheckedChange={(c) => setCols(c ? [...cols, f.key] : cols.filter((x) => x !== f.key))}>{f.label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
        <label className="flex items-center gap-2 text-xs"><Switch checked={showArchived} onCheckedChange={setShowArchived} />Show archived</label>
        <span className="text-xs text-muted-foreground">Linked questions: {def.questions.join(", ")}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={template}><Download className="h-4 w-4 mr-1" />Template</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          {canWrite && <label className="inline-flex"><input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /><span className="inline-flex items-center h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-secondary"><FileUp className="h-4 w-4 mr-1" />Import CSV</span></label>}
          {canWrite && <Button size="sm" onClick={() => setEdit({ data: {}, visibility: "customer" })}><Plus className="h-4 w-4 mr-1" />Add</Button>}
        </div>
      </div>
      {list.length === 0 ? <EmptyState title={`No ${def.label.toLowerCase()} records`}>Add records individually, or download the template and import a CSV with a preview before commit.</EmptyState> : (
        <div className="card-elevated overflow-x-auto max-h-[640px]">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b bg-secondary/40 sticky top-0"><tr><th className="p-2.5">ID</th><th className="p-2.5">Title</th>{def.fields.filter((f) => cols.includes(f.key)).map((f) => <th key={f.key} className="p-2.5">{f.label}</th>)}<th className="p-2.5">Review</th><th className="p-2.5"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={`border-b last:border-0 ${r.archived ? "opacity-50" : ""}`}>
                  <td className="p-2.5 font-mono text-xs whitespace-nowrap">{r.code}</td>
                  <td className="p-2.5 font-medium">{r.title} {r.visibility === "internal" && <Pill tone="warning">internal</Pill>}</td>
                  {def.fields.filter((f) => cols.includes(f.key)).map((f) => <td key={f.key} className="p-2.5 text-xs max-w-[220px] truncate" title={String(r.data?.[f.key] ?? "")}>{r.data?.[f.key] === undefined || r.data?.[f.key] === "" ? <span className="text-muted-foreground">—</span> : String(r.data[f.key])}</td>)}
                  <td className="p-2.5"><Pill tone={r.review_status === "reviewed" ? "teal" : "muted"}>{r.review_status}</Pill></td>
                  <td className="p-2.5 whitespace-nowrap">
                    {canWrite && <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>Edit</Button>}
                    {me.canEditInternal && <Button size="sm" variant="ghost" onClick={() => review(r, r.review_status === "reviewed" ? "draft" : "reviewed")}>{r.review_status === "reviewed" ? "Unreview" : "Review"}</Button>}
                    {canWrite && <Button size="sm" variant="ghost" onClick={() => archive(r)}>{r.archived ? "Restore" : "Archive"}</Button>}
                    <EvidenceUpload targetType="register_item" targetId={r.id} trigger={<Button size="sm" variant="ghost" disabled={me.readOnly}><Upload className="h-3.5 w-3.5" /><span className="sr-only">Add evidence</span></Button>} />
                    <CommentsSheet targetType="register_item" targetId={r.code} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? `Edit ${edit.code}` : `New ${def.label} record`}</DialogTitle><DialogDescription>Stable ID is unique within this assessment.</DialogDescription></DialogHeader>
          {edit && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label htmlFor="rc">Stable ID</Label><Input id="rc" value={edit.code ?? ""} placeholder={nextCode()} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></div>
              <div><Label htmlFor="rt">Title</Label><Input id="rt" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
              {def.fields.map((f) => (
                <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                  <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                  {f.type === "select" ? (
                    <Select value={edit.data?.[f.key] ?? ""} onValueChange={(v) => setEdit({ ...edit, data: { ...edit.data, [f.key]: v } })}><SelectTrigger id={`f-${f.key}`}><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                  ) : f.type === "textarea" ? (
                    <Textarea id={`f-${f.key}`} value={edit.data?.[f.key] ?? ""} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, [f.key]: e.target.value } })} />
                  ) : (
                    <Input id={`f-${f.key}`} type={f.type === "number" ? "number" : "text"} min={f.type === "number" ? 0 : undefined} value={edit.data?.[f.key] ?? ""} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, [f.key]: f.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value } })} />
                  )}
                </div>
              ))}
              <div><Label>Linked questions</Label><Input value={(edit.linked_question_ids ?? def.questions.slice(0, 1)).join(", ")} onChange={(e) => setEdit({ ...edit, linked_question_ids: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) })} /></div>
              {me.canEditInternal && <div><Label>Visibility</Label><Select value={edit.visibility ?? "customer"} onValueChange={(v) => setEdit({ ...edit, visibility: v as "customer" | "internal" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="customer">Customer-visible</SelectItem><SelectItem value="internal">Internal only</SelectItem></SelectContent></Select></div>}
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!importRows} onOpenChange={(o) => !o && setImportRows(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Import preview — {def.label}</DialogTitle><DialogDescription>Nothing is saved until you commit. Rows with an existing stable ID update that record; formulas and macros are never executed.</DialogDescription></DialogHeader>
          {importRows && (<>
            {importRows.errors.length > 0 && <ul className="text-xs text-warning-foreground bg-warning-soft rounded p-2 max-h-28 overflow-y-auto">{importRows.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            <div className="overflow-auto max-h-80 border rounded"><table className="text-xs w-full"><thead className="bg-secondary sticky top-0"><tr>{Object.keys(importRows.rows[0] ?? {}).map((k) => <th key={k} className="p-1.5 text-left">{k}</th>)}<th className="p-1.5">Action</th></tr></thead>
              <tbody>{importRows.rows.slice(0, 200).map((r, i) => <tr key={i} className="border-t">{Object.values(r).map((v, j) => <td key={j} className="p-1.5 max-w-[160px] truncate">{v}</td>)}<td className="p-1.5">{rows.some((x) => x.code === r.code) ? <Pill tone="info">update</Pill> : <Pill tone="success">new</Pill>}</td></tr>)}</tbody></table></div>
            <p className="text-xs text-muted-foreground">{importRows.rows.length} valid rows{importRows.rows.length > 200 ? " (first 200 shown)" : ""}.</p>
          </>)}
          <DialogFooter><Button variant="outline" onClick={() => setImportRows(null)}>Cancel</Button><Button onClick={commitImport} disabled={!importRows?.rows.length}>Commit import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EvidenceList() {
  const { assessment, me } = useAssessment();
  const ev = useAssessmentTable<Evidence>("evidence_files", assessment.id);
  const qc = useQueryClient();
  const setStatus = async (e: Evidence, s: string) => { const { error } = await db.from("evidence_files").update({ status: s }).eq("id", e.id); if (error) toast.error(error.message); qc.invalidateQueries({ queryKey: ["evidence_files", assessment.id] }); qc.invalidateQueries({ queryKey: ["evidence", assessment.id] }); };
  const list = ev.data ?? [];
  return (
    <div className="mt-4">
      <div className="flex justify-end mb-3"><EvidenceUpload trigger={<Button size="sm" disabled={me.readOnly}><Upload className="h-4 w-4 mr-1" />Upload source file</Button>} /></div>
      {list.length === 0 ? <EmptyState title="No evidence yet">Attach files from a question, a register record, or here.</EmptyState> : (
        <div className="card-elevated overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b bg-secondary/40"><tr><th className="p-2.5">File</th><th className="p-2.5">Linked to</th><th className="p-2.5">Version</th><th className="p-2.5">Class</th><th className="p-2.5">Status</th><th className="p-2.5">Checksum</th><th className="p-2.5">Uploaded</th><th className="p-2.5"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{list.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="p-2.5"><button className="text-teal hover:underline inline-flex items-center gap-1" onClick={() => openEvidence(e.storage_path)}>{e.original_filename}<ExternalLink className="h-3 w-3" /></button><div className="text-xs text-muted-foreground">{e.description} · {(e.size_bytes / 1024).toFixed(0)} KB</div></td>
                <td className="p-2.5 text-xs font-mono">{e.question_id ?? e.target_type}</td>
                <td className="p-2.5">v{e.version}</td>
                <td className="p-2.5"><Pill tone={e.classification === "internal" ? "warning" : "outline"}>{e.classification}</Pill></td>
                <td className="p-2.5"><Pill tone={e.status === "validated" ? "success" : e.status === "rejected" ? "destructive" : e.status === "superseded" ? "muted" : "info"}>{e.status}</Pill></td>
                <td className="p-2.5 font-mono text-[10px]" title={e.checksum}>{e.checksum.slice(0, 10)}…</td>
                <td className="p-2.5 text-xs">{fmtDate(e.created_at)}</td>
                <td className="p-2.5 whitespace-nowrap">
                  {me.canEditInternal && e.status !== "validated" && <Button size="sm" variant="ghost" onClick={() => setStatus(e, "validated")}>Validate</Button>}
                  {me.canEditInternal && e.status !== "rejected" && <Button size="sm" variant="ghost" onClick={() => setStatus(e, "rejected")}>Reject</Button>}
                  {e.status !== "superseded" && <EvidenceUpload questionId={e.question_id ?? undefined} targetType={e.target_type ?? undefined} targetId={e.target_id ?? undefined} replaces={{ id: e.id, version: e.version }} trigger={<Button size="sm" variant="ghost" disabled={me.readOnly}>Replace</Button>} />}
                </td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-3">Downloads use 60-second signed links checked against your current project access. Automated malware scanning is not available on this backend — validate files before opening.</p>
    </div>
  );
}
