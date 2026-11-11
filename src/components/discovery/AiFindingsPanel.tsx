import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Pill } from "@/components/app/bits";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { aiResultSchema, type AiReview } from "@/lib/aiFindings";

export function AiFindingsPanel() {
  const { assessment, project, me } = useAssessment();
  const qc = useQueryClient();
  const reviews = useAssessmentTable<AiReview>("ai_discovery_reviews", assessment.id);
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ai_discovery_reviews", assessment.id] });
  const save = async (analyze: boolean) => {
    if (!notes.trim() || (analyze && !consent)) return;
    setBusy(true);
    try {
      const { data, error } = await db.from("ai_discovery_reviews").insert({ notes: notes.trim(), assessment_id: assessment.id, project_id: project.id }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Could not save findings");
      await refresh();
      if (analyze) {
        const result = await supabase.functions.invoke("analyze-discovery", { body: { review_id: data.id, consent: true } });
        if (result.error) {
          let message = "AI analysis failed. Findings remain saved.";
          if (result.error.context instanceof Response) { const body = await result.error.context.json(); message = body.error ?? message; }
          throw new Error(message);
        }
        aiResultSchema.parse(result.data.result);
        toast.success("AI analysis saved — ready for review");
      } else toast.success("Discovery findings saved");
      setNotes("");
    } catch (error) { toast.error((error as Error).message); }
    finally { await refresh(); setBusy(false); }
  };
  const approve = async (id: string, approved: boolean) => {
    const { error } = await db.from("ai_discovery_reviews").update({ approved }).eq("id", id);
    if (error) toast.error(error.message); else { await refresh(); toast.success(approved ? "Approved for client proposal" : "Approval withdrawn"); }
  };
  return <section className="border-y py-6 mb-6 space-y-5" aria-labelledby="ai-findings-title">
    <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-teal" /><h2 id="ai-findings-title" className="text-xl font-semibold">Discovery intelligence</h2><Pill tone="info">AI-assisted</Pill></div>
    {me.canEditInternal && <div className="space-y-3 max-w-4xl">
      <Label htmlFor="discovery-notes">Business analyst findings</Label>
      <Textarea id="discovery-notes" rows={6} maxLength={20000} value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} placeholder="Workshop observations, business pain points, process gaps, dependencies and evidence…" />
      <label className="flex items-start gap-2 text-sm"><Checkbox checked={consent} onCheckedChange={v => setConsent(v === true)} /><span>I approve sending these notes to AI Gateway. No passwords, personal data or confidential commercial terms.</span></label>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !notes.trim()} onClick={() => save(false)}><Save className="h-4 w-4 mr-2" />Save findings</Button><Button disabled={busy || !consent || !notes.trim()} onClick={() => save(true)}>{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}{busy ? "Saving and analyzing…" : "Analyze findings"}</Button></div>
    </div>}
    {reviews.isError && <p role="alert" className="text-destructive">Saved findings could not be loaded.</p>}
    {[...(reviews.data ?? [])].reverse().map(review => <article key={review.id} className="border rounded-md p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{new Date(review.created_at).toLocaleString()}</h3><Pill tone={review.approved ? "success" : "warning"}>{review.approved ? "Client-approved" : "Draft · human review required"}</Pill>{review.result && me.canEditInternal && <Button className="ml-auto" variant="outline" size="sm" onClick={() => approve(review.id, !review.approved)}>{review.approved ? "Withdraw approval" : "Approve for proposal"}</Button>}</div>
      <details><summary className="cursor-pointer text-sm text-muted-foreground">Source discovery findings</summary><p className="whitespace-pre-wrap text-sm mt-2">{review.notes}</p></details>
      {review.result ? <><p className="text-sm leading-relaxed">{review.result.summary}</p><div className="grid lg:grid-cols-3 gap-6">
        <div><h4 className="font-semibold border-b pb-2 mb-3">Themes</h4>{review.result.themes.map((x,i) => <div key={i} className="mb-4 text-sm"><strong>{x.title}</strong><p className="mt-1">{x.detail}</p><p className="text-xs text-muted-foreground mt-1">Evidence: {x.source}</p></div>)}</div>
        <div><h4 className="font-semibold border-b pb-2 mb-3">Risks</h4>{review.result.risks.map((x,i) => <div key={i} className="mb-4 text-sm"><Pill tone={x.severity === "high" ? "destructive" : "warning"}>{x.severity}</Pill><strong className="block mt-1">{x.title}</strong><p>{x.detail}</p><p className="mt-1 text-muted-foreground">Mitigation: {x.mitigation}</p><p className="text-xs text-muted-foreground mt-1">Evidence: {x.source}</p></div>)}</div>
        <div><h4 className="font-semibold border-b pb-2 mb-3">Recommended next steps</h4>{review.result.recommendations.map((x,i) => <div key={i} className="mb-4 text-sm"><Pill tone="info">{x.priority}</Pill><strong className="block mt-1">{x.title}</strong><p>{x.detail}</p><p className="text-xs text-muted-foreground mt-1">Suggested owner: {x.owner}<br />Success: {x.success_criterion}<br />Evidence: {x.source}</p></div>)}</div>
      </div>{review.result.unknowns.length > 0 && <div className="text-sm border-t pt-3"><h4 className="font-semibold">Open validation questions</h4><ul className="list-disc pl-5 mt-2">{review.result.unknowns.map((x,i) => <li key={i}>{x}</li>)}</ul></div>}</> : <p className="text-sm text-muted-foreground">Saved notes · no completed AI analysis for this version.</p>}
    </article>)}
  </section>;
}