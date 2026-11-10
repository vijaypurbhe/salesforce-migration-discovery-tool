import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, sha256Hex } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAssessment } from "@/context/AssessmentContext";
import { useAuth } from "@/context/AuthContext";

const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/json", "application/zip"];
const BLOCKED_EXT = /\.(exe|bat|cmd|sh|ps1|js|msi|dll|com|scr|jar|vbs|html?|svg)$/i;
export const MAX_BYTES = 25 * 1024 * 1024;

export function EvidenceUpload({ questionId, targetType, targetId, replaces, trigger }: { questionId?: string; targetType?: string; targetId?: string; replaces?: { id: string; version: number }; trigger?: React.ReactNode }) {
  const { assessment, project, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [desc, setDesc] = useState("");
  const [cls, setCls] = useState("customer");
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) return;
    if (file.size > MAX_BYTES) return toast.error("Files must be 25 MB or smaller.");
    if (BLOCKED_EXT.test(file.name) || (file.type && !ALLOWED.includes(file.type))) return toast.error("This file type is not allowed. Use PDF, Office, CSV, text, image, JSON or ZIP.");
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const checksum = await sha256Hex(buf);
      const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80);
      const path = `${project.id}/${assessment.id}/${crypto.randomUUID()}-${safe}`;
      const { error: ue } = await supabase.storage.from("evidence").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (ue) throw ue;
      const { error } = await db.from("evidence_files").insert({
        assessment_id: assessment.id, project_id: project.id, question_id: questionId ?? null, target_type: targetType ?? (questionId ? "question" : null), target_id: targetId ?? questionId ?? null,
        storage_path: path, original_filename: file.name, mime_type: file.type || "application/octet-stream", size_bytes: file.size, checksum,
        classification: cls, version: replaces ? replaces.version + 1 : 1, replaces_id: replaces?.id ?? null, description: desc, uploaded_by: user!.id,
      });
      if (error) throw error;
      if (replaces && me.canEditInternal) await db.from("evidence_files").update({ status: "superseded" }).eq("id", replaces.id);
      await db.from("audit_events").insert({ project_id: project.id, assessment_id: assessment.id, actor: user!.id, action: "evidence.uploaded", object_type: "evidence", object_id: questionId ?? targetId ?? path, summary: `${file.name} (${cls})` });
      toast.success("Evidence uploaded");
      qc.invalidateQueries({ queryKey: ["evidence", assessment.id] });
      qc.invalidateQueries({ queryKey: ["evidence_files", assessment.id] });
      setOpen(false); setFile(null); setDesc("");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm" variant="ghost" disabled={me.readOnly}><Paperclip className="h-4 w-4 mr-1" />Add evidence</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{replaces ? "Replace evidence (new version)" : "Add evidence"}</DialogTitle>
          <DialogDescription>Stored privately for this project only. Do not upload credentials, tokens or production passwords.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="ev-file">File (max 25 MB)</Label><Input id="ev-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          <div><Label htmlFor="ev-desc">What does this show?</Label><Input id="ev-desc" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div><Label>Classification</Label>
            <Select value={cls} onValueChange={setCls}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="customer">Customer-visible</SelectItem><SelectItem value="confidential">Confidential (project members)</SelectItem>{me.isInternal && <SelectItem value="internal">Internal only</SelectItem>}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button onClick={upload} disabled={!file || busy}>{busy ? "Uploading…" : "Upload"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function openEvidence(path: string) {
  const { data, error } = await supabase.storage.from("evidence").createSignedUrl(path, 60);
  if (error || !data) { toast.error(error?.message ?? "Not permitted"); return; }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
