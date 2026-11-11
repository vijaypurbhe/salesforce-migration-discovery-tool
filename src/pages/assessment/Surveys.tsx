import { useState } from "react";
import { Copy, Link2, Download, Send, Ban } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAssessment, useAssessmentTable } from "@/context/AssessmentContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Pill } from "@/components/app/bits";
import { surveyRequest, type SurveyResponse } from "@/lib/customerSurvey";
import { db } from "@/lib/db";
import { QUESTION_BY_ID } from "@/domain/questionBank";
interface Survey { id: string; recipient_label: string; scope: string; expires_at: string; revoked_at: string | null; submitted_at: string | null; imported_at: string | null; respondent_email: string | null; responses: Record<string, SurveyResponse>; question_ids: string[] }

export default function Surveys() {
  const { assessment, me } = useAssessment();
  const qc = useQueryClient();
  const list = useAssessmentTable<Survey>("customer_surveys", assessment.id, { enabled: me.isInternal });
  const [label, setLabel] = useState(""); const [scope, setScope] = useState("quick");
  const [link, setLink] = useState(""); const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Survey | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["customer_surveys", assessment.id] });
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const s = await surveyRequest<{ token: string }>({ action: "create", assessment_id: assessment.id, recipient_label: label, scope });
      setLink(`${window.location.origin}/survey#survey=${s.token}`); await refresh();
    } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const importAnswers = async (s: Survey) => {
    setBusy(true);
    const { data, error } = await db.rpc("import_customer_survey", { p_survey: s.id });
    if (error) toast.error(error.message); else { toast.success(`${data.imported} responses imported; ${data.skipped} existing answers preserved.`); setReview(null); await refresh(); qc.invalidateQueries({ queryKey: ["answers", assessment.id] }); }
    setBusy(false);
  };
  const revoke = async (s: Survey) => {
    setBusy(true);
    try { await surveyRequest({ action: "revoke", survey_id: s.id }); await refresh(); toast.success("Survey link closed"); } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  if (!me.isInternal) return <p role="alert">Only your assessment team can manage customer surveys.</p>;
  return <div className="space-y-7">
    <PageHeader kicker="Customer discovery" title="Customer surveys" />
    {me.canEditInternal && <section className="border-y py-5 space-y-4">
      <h2 className="font-semibold">Create a customer survey link</h2>
      <form onSubmit={create} className="grid sm:grid-cols-[1fr_240px_auto] gap-4 items-end">
        <div className="space-y-2"><Label htmlFor="recipient">Customer / recipient label</Label><Input id="recipient" maxLength={254} required value={label} onChange={e => setLabel(e.target.value)} placeholder="Customer name or email" /></div>
        <div className="space-y-2"><Label>Survey scope</Label><Select value={scope} onValueChange={setScope}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quick">Quick start · 20 questions</SelectItem><SelectItem value="full">Full discovery · 125 questions</SelectItem></SelectContent></Select></div>
        <Button disabled={busy}><Link2 className="h-4 w-4 mr-2" />Create link</Button>
      </form>
      {link && <div className="space-y-3"><Label htmlFor="customer-link">Private customer link · expires in 30 days</Label><Input id="customer-link" readOnly value={link} onFocus={e => e.target.select()} /><div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Customer survey link copied"); } catch { toast.error("Select and copy the link above."); } }}><Copy className="h-4 w-4 mr-2" />Copy link</Button>
        <Button variant="outline" onClick={() => { const a = document.createElement("a"); const url = URL.createObjectURL(new Blob([`${assessment.name}\n\nPlease complete your discovery survey:\n${link}`], { type: "text/plain" })); a.href = url; a.download = "customer-survey-invitation.txt"; a.click(); URL.revokeObjectURL(url); }}><Download className="h-4 w-4 mr-2" />Download invitation</Button>
        <Button variant="outline" asChild><a href={`mailto:${label.includes("@") ? encodeURIComponent(label) : ""}?subject=${encodeURIComponent(`${assessment.name} — discovery survey`)}&body=${encodeURIComponent(`Please complete your discovery survey:\n\n${link}\n\nThank you.`)}`}><Send className="h-4 w-4 mr-2" />Open email draft</a></Button>
      </div><p className="text-sm text-muted-foreground">Anyone with this link can complete this survey, but cannot open your workspace. Save it now; it is shown only once.</p></div>}
    </section>}
    <section className="space-y-3"><h2 className="font-semibold">Customer responses</h2>
      {list.isLoading ? <p>Loading surveys…</p> : list.isError ? <p role="alert" className="text-destructive">Could not load surveys.</p> : !list.data?.length ? <p className="text-muted-foreground">No customer surveys yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="border-b text-muted-foreground"><tr><th className="py-3">Recipient</th><th>Progress</th><th>Status</th><th>Expires</th><th /></tr></thead><tbody>{[...(list.data ?? [])].reverse().map(s => <tr className="border-b" key={s.id}>
        <td className="py-4 pr-4"><p className="font-medium">{s.recipient_label}</p><p className="text-xs text-muted-foreground">{s.respondent_email}</p></td><td className="pr-4">{Object.keys(s.responses).length}/{s.question_ids.length}</td><td className="pr-4"><Pill>{s.imported_at ? "Imported" : s.revoked_at ? "Closed" : s.submitted_at ? "Submitted" : Date.parse(s.expires_at) <= Date.now() ? "Expired" : "Awaiting customer"}</Pill></td><td className="pr-4 whitespace-nowrap">{new Date(s.expires_at).toLocaleDateString()}</td><td><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setReview(s)}>Review</Button>{me.canEditInternal && !s.revoked_at && !s.submitted_at && <Button variant="ghost" size="icon" aria-label={`Close survey for ${s.recipient_label}`} title="Close survey link" disabled={busy} onClick={() => revoke(s)}><Ban className="h-4 w-4" /></Button>}</div></td>
      </tr>)}</tbody></table></div>}
    </section>
    {review && <section className="border-t pt-6 space-y-4"><div className="flex justify-between gap-3"><h2 className="font-semibold">Responses: {review.recipient_label}</h2><Button variant="ghost" onClick={() => setReview(null)}>Close review</Button></div>
      {Object.entries(review.responses).map(([id, r]) => <article key={id} className="border-b py-4 space-y-2"><h3 className="font-medium">{id} · {QUESTION_BY_ID[id]?.label}</h3><Pill>{r.state.replaceAll("_", " ")}</Pill>{r.value && <pre className="whitespace-pre-wrap break-words text-xs bg-secondary p-3 rounded-md">{JSON.stringify(r.value, null, 2)}</pre>}{r.notes && <p className="text-sm whitespace-pre-wrap">{r.notes}</p>}{r.na_reason && <p className="text-sm">{r.na_reason}</p>}</article>)}
      {me.canEditInternal && review.submitted_at && !review.imported_at && <><p className="text-sm text-muted-foreground">Existing assessment answers are preserved. New answers will be added as self-reported discovery for your review.</p><Button disabled={busy} onClick={() => importAnswers(review)}>Import responses into discovery</Button></>}
    </section>}
  </div>;
}