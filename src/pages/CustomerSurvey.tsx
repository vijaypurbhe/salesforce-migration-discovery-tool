import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AnswerControl, validateValue } from "@/components/discovery/AnswerControl";
import { QUESTION_BY_ID } from "@/domain/questionBank";
import { surveyRequest, type SurveyData, type SurveyResponse } from "@/lib/customerSurvey";

const empty: SurveyResponse = { state: "known", value: {}, notes: "", na_reason: "" };
export default function CustomerSurvey() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("survey") ?? "");
  const [data, setData] = useState<SurveyData | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<SurveyResponse>(empty);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!token) { setError("This survey link is incomplete. Ask your assessment team for a new link."); return; }
    surveyRequest<SurveyData>({ action: "load", token }).then(s => {
      setData(s); setEmail(s.respondent_email ?? "");
      const next = s.question_ids.findIndex(id => !s.responses[id]);
      const i = next < 0 ? 0 : next; setIndex(i); setDraft(s.responses[s.question_ids[i]] ?? empty);
    }).catch(e => setError(e.message));
  }, [token]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const q = data ? QUESTION_BY_ID[data.question_ids[index]] : null;
  const edit = (p: Partial<SurveyResponse>) => { setDraft(d => ({ ...d, ...p })); setDirty(true); };
  const save = async () => {
    if (!data || !q) return false;
    const invalid = draft.state === "known" ? validateValue(q, draft.value ?? {}) : draft.state === "not_applicable" && !draft.na_reason.trim() ? "Please provide a reason." : null;
    if (invalid) { toast.error(invalid); return false; }
    setBusy(true);
    try {
      const result = await surveyRequest<{ row_version: number }>({ action: "save", token, email, question_id: q.id, response: draft, expected_version: data.row_version });
      setData({ ...data, row_version: result.row_version, responses: { ...data.responses, [q.id]: draft } }); setDirty(false); return true;
    } catch (e) { toast.error((e as Error).message); return false; }
    finally { setBusy(false); }
  };
  const go = async (i: number) => {
    if (!data || (dirty && !(await save()))) return;
    setIndex(i); setDraft(data.responses[data.question_ids[i]] ?? empty); setDirty(false); window.scrollTo(0, 0);
  };
  const submit = async () => {
    if (!data || dirty) return;
    setBusy(true);
    try {
      const result = await surveyRequest<{ submitted_at: string; row_version: number }>({ action: "submit", token, email, expected_version: data.row_version });
      setData({ ...data, ...result });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const answered = data ? Object.keys(data.responses).length : 0;
  return <main className="min-h-screen bg-background">
    <header className="border-b px-5 py-4"><div className="max-w-3xl mx-auto"><BrandMark /></div></header>
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      {error ? <div role="alert" className="text-destructive">{error}</div> : !data ? <p aria-live="polite">Opening survey…</p> : data.submitted_at ? <section className="py-12 space-y-4"><CheckCircle2 className="h-12 w-12 text-success" /><h1 className="text-3xl font-bold">Thank you — survey submitted</h1><p className="text-muted-foreground">Your responses have been saved for your assessment team.</p><p className="text-sm">{data.name}</p></section> : !started ? <section className="space-y-5">
        <p className="kicker">Customer discovery survey</p><h1 className="text-3xl font-bold break-words">{data.name}</h1>
        <p className="text-muted-foreground">{data.question_ids.length} questions · {answered} saved responses</p>
        <form className="space-y-4 max-w-sm" onSubmit={e => { e.preventDefault(); setStarted(true); }}>
          <Label htmlFor="survey-email">Your email address</Label><Input id="survey-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} />
          <Button type="submit">{answered ? "Resume survey" : "Start survey"}<ChevronRight className="ml-2 h-4 w-4" /></Button>
        </form>
      </section> : q && <>
        <div><p className="kicker">Customer discovery survey</p><h1 className="text-2xl font-bold mt-1 break-words">{data.name}</h1></div>
        <div className="space-y-2"><div className="flex justify-between text-sm"><span>Question {index + 1} of {data.question_ids.length}</span><span>{answered} saved</span></div><Progress value={answered / data.question_ids.length * 100} aria-label="Saved survey progress" /></div>
        <section className="space-y-4 border-y py-6">
          <p className="font-mono text-xs text-teal">{q.id}</p><h2 className="text-xl font-semibold">{q.label}</h2><p className="text-sm text-muted-foreground">{q.detail}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Answer status">{([['known', 'Provide answer'], ['unknown', 'Unknown'], ['needs_validation', 'Needs validation'], ['not_applicable', 'Not applicable']] as const).map(([state, label]) => <Button key={state} disabled={busy} variant={draft.state === state ? "default" : "outline"} aria-pressed={draft.state === state} onClick={() => edit({ state })}>{label}</Button>)}</div>
          {(draft.state === "known" || draft.state === "needs_validation") && <AnswerControl q={q} value={draft.value ?? {}} onChange={value => edit({ value })} disabled={busy} />}
          {draft.state === "not_applicable" && <div className="space-y-2"><Label htmlFor="survey-na">Reason this does not apply</Label><Input id="survey-na" maxLength={2000} value={draft.na_reason} onChange={e => edit({ na_reason: e.target.value })} /></div>}
          <div className="space-y-2"><Label htmlFor="survey-notes">Additional context (optional)</Label><Textarea id="survey-notes" maxLength={10000} value={draft.notes} onChange={e => edit({ notes: e.target.value })} /></div>
          <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground" aria-live="polite">{dirty ? "Unsaved changes" : data.responses[q.id] ? "Response saved" : "Not answered"}</span><Button onClick={save} disabled={busy}><Save className="h-4 w-4 mr-2" />{busy ? "Saving…" : "Save answer"}</Button></div>
        </section>
        <div className="flex justify-between gap-3"><Button variant="outline" disabled={busy || index === 0} onClick={() => go(index - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button variant="outline" disabled={busy || index === data.question_ids.length - 1} onClick={() => go(index + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
        {answered === data.question_ids.length && <Button onClick={submit} disabled={busy || dirty} className="w-full"><Send className="h-4 w-4 mr-2" />Submit survey to assessment team</Button>}
      </>}
    </div>
  </main>;
}