import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, GitCompare, History, MessageSquare, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { db, must } from "@/lib/db";
import { useAssessment } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";
import type { CommentRow } from "@/lib/models";
import { fmtDate, Pill } from "@/components/app/bits";
import { EvidenceUpload } from "./EvidenceUpload";

export function AssignButton({ questionId, kind, label, icon: Icon }: { questionId: string; kind: "sme" | "workshop" | "ask_later"; label: string; icon: typeof UserPlus }) {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState(""); const [note, setNote] = useState(""); const [due, setDue] = useState("");
  const create = async () => {
    const { error } = await db.from("assignments").insert({ assessment_id: assessment.id, project_id: project.id, question_id: questionId, kind, assignee_label: who, note, due_date: due || null, created_by: user!.id });
    if (error) return toast.error(error.message);
    toast.success(`${label}: ${questionId}`); setOpen(false); setWho(""); setNote(""); setDue("");
    qc.invalidateQueries({ queryKey: ["assignments", assessment.id] });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost" disabled={me.readOnly}><Icon className="h-4 w-4 mr-1" />{label}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{label} — {questionId}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {kind !== "ask_later" && <div><Label htmlFor="as-who">{kind === "sme" ? "SME name or role" : "Workshop / facilitator"}</Label><Input id="as-who" value={who} onChange={(e) => setWho(e.target.value)} /></div>}
          <div><Label htmlFor="as-note">Note</Label><Textarea id="as-note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div><Label htmlFor="as-due">Due date</Label><Input id="as-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={create}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CommentsSheet({ targetType, targetId, count }: { targetType: string; targetId: string; count?: number }) {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState(""); const [internal, setInternal] = useState(false);
  const q = useQuery({ queryKey: ["comments", assessment.id, targetType, targetId], queryFn: () => must<CommentRow[]>(db.from("comments").select("*").eq("assessment_id", assessment.id).eq("target_type", targetType).eq("target_id", targetId).order("created_at")) });
  const post = async () => {
    if (!body.trim()) return;
    const { error } = await db.from("comments").insert({ assessment_id: assessment.id, project_id: project.id, target_type: targetType, target_id: targetId, body: body.trim(), visibility: internal ? "internal" : "customer", author: user!.id });
    if (error) return toast.error(error.message);
    setBody(""); qc.invalidateQueries({ queryKey: ["comments", assessment.id, targetType, targetId] });
  };
  return (
    <Sheet>
      <SheetTrigger asChild><Button size="sm" variant="ghost"><MessageSquare className="h-4 w-4 mr-1" />Comments{q.data?.length ? ` (${q.data.length})` : count ? ` (${count})` : ""}</Button></SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader><SheetTitle>Comments · {targetId}</SheetTitle></SheetHeader>
        <ul className="flex-1 overflow-y-auto space-y-3 mt-4">
          {(q.data ?? []).map((c) => (
            <li key={c.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{fmtDate(c.created_at)}</span>{c.visibility === "internal" && <Pill tone="warning">Internal</Pill>}</div>
              <p className="whitespace-pre-wrap break-words">{c.body}</p>
            </li>
          ))}
          {q.data?.length === 0 && <li className="text-sm text-muted-foreground">No comments yet.</li>}
        </ul>
        <div className="space-y-2 border-t pt-3">
          <Textarea aria-label="New comment" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="Add a comment…" />
          <div className="flex items-center justify-between">
            {me.isInternal ? <label className="flex items-center gap-2 text-xs"><Switch checked={internal} onCheckedChange={setInternal} />Internal only</label> : <span />}
            <Button size="sm" onClick={post}>Post</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function RevisionHistory({ answerId, questionId }: { answerId?: string; questionId: string }) {
  const q = useQuery({ queryKey: ["revisions", answerId], enabled: !!answerId, queryFn: () => must<any[]>(db.from("answer_revisions").select("*").eq("answer_id", answerId).order("row_version", { ascending: false })) });
  return (
    <Sheet>
      <SheetTrigger asChild><Button size="sm" variant="ghost" disabled={!answerId}><History className="h-4 w-4 mr-1" />History</Button></SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Revision history · {questionId}</SheetTitle></SheetHeader>
        <ol className="mt-4 space-y-3">
          {(q.data ?? []).map((r) => (
            <li key={r.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between text-xs text-muted-foreground"><span>v{r.row_version} · {fmtDate(r.changed_at)}</span><span>{r.state.replace("_", " ")} · {r.review_status}</span></div>
              <pre className="mt-2 text-xs bg-secondary rounded p-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(r.value, null, 1)}</pre>
              {r.na_reason && <p className="text-xs mt-1">N/A reason: {r.na_reason}</p>}
              {r.notes && <p className="text-xs mt-1">Notes: {r.notes}</p>}
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground mt-4">Revisions are immutable. Restoring an old value creates a new revision.</p>
      </SheetContent>
    </Sheet>
  );
}

export function ActionBar({ questionId, answerId }: { questionId: string; answerId?: string }) {
  return (
    <div className="flex flex-wrap gap-0.5 -ml-2">
      <AssignButton questionId={questionId} kind="sme" label="Assign to SME" icon={UserPlus} />
      <AssignButton questionId={questionId} kind="workshop" label="Flag for workshop" icon={Users} />
      <AssignButton questionId={questionId} kind="ask_later" label="Ask later" icon={CalendarClock} />
      <EvidenceUpload questionId={questionId} />
      <CommentsSheet targetType="question" targetId={questionId} />
      <RevisionHistory answerId={answerId} questionId={questionId} />
      <Button asChild size="sm" variant="ghost"><Link to={`../findings?q=${questionId}`}><GitCompare className="h-4 w-4 mr-1" />View linked gap</Link></Button>
    </div>
  );
}
