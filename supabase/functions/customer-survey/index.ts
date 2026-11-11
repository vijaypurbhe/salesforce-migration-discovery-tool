import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { createCapability, isCapability } from "./capability.ts";
import { surveyIsOpen, allowedSurveyQuestion } from "./policy.ts";
import bank from "./questions.json" with { type: "json" };

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const hash = async (token: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), x => x.toString(16).padStart(2, "0")).join("");
const uuid = z.string().uuid();
const email = z.string().trim().email().max(254);
const draft = z.object({ state: z.enum(["known", "unknown", "needs_validation", "not_applicable"]), value: z.record(z.unknown()).nullable(), notes: z.string().max(10000).default(""), na_reason: z.string().max(2000).default("") }).strict();
const commands = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), assessment_id: uuid, recipient_label: z.string().trim().max(254), scope: z.enum(["quick", "full"]) }).strict(),
  z.object({ action: z.literal("revoke"), survey_id: uuid }).strict(),
  z.object({ action: z.literal("load"), token: z.string() }).strict(),
  z.object({ action: z.literal("save"), token: z.string(), email, question_id: z.string(), response: draft, expected_version: z.number().int().nonnegative() }).strict(),
  z.object({ action: z.literal("submit"), token: z.string(), email, expected_version: z.number().int().nonnegative() }).strict(),
]);

function validResponse(id: string, response: z.infer<typeof draft>) {
  const q = bank.questions.find(x => x.id === id);
  if (!q || !q.customerVisible) return "Invalid question";
  if (response.state === "not_applicable" && !response.na_reason.trim()) return "A reason is required for Not applicable";
  if (response.state !== "known") return null;
  const v = response.value;
  if (!v) return "Provide an answer";
  const selected = Array.isArray(v.selected) ? v.selected : typeof v.selected === "string" ? [v.selected] : [];
  if (["single", "multi"].includes(q.control)) {
    if (!selected.length || (q.control === "single" && (typeof v.selected !== "string"))) return "Choose an option";
    if (selected.some(s => !q.options.some(o => o.value === s))) return "Invalid option";
    if (q.noneExclusive && selected.length > 1 && selected.some(s => typeof s === "string" && s.startsWith("none"))) return "None cannot be combined with other options";
    if (selected.includes("other") && (typeof v.other !== "string" || !v.other.trim())) return "Describe Other";
  }
  if (q.control === "text" && !(typeof v.text === "string" && v.text.trim()) && !(v.details && typeof v.details === "object" && Object.values(v.details).some(x => typeof x === "string" && x.trim()))) return "Enter a response";
  if (["repeatable", "table"].includes(q.control) && (!Array.isArray(v.items) || !v.items.length || v.items.some(x => !x || typeof x !== "object"))) return "Add at least one entry";
  if (["date", "dateRange"].includes(q.control) && (typeof v.start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.start) || !Number.isFinite(Date.parse(v.start)))) return "Choose a valid date";
  if (q.control === "dateRange" && v.end && (typeof v.end !== "string" || v.end < String(v.start))) return "End date must follow start date";
  if (q.control === "count") {
    const c = v.count as { mode?: string; exact?: number; band?: string } | undefined;
    if (!c || !["exact", "estimate", "band"].includes(c.mode ?? "")) return "Enter a count";
    if (c.mode === "exact" ? !Number.isInteger(c.exact) || Number(c.exact) < 0 : !/^(0|1-10|11-50|51-200|201-1000|1001-10000|10001-100000|100001\+)$/.test(c.band ?? "")) return "Enter a valid count or band";
  }
  if (q.control === "number") {
    const metrics = v.metrics && typeof v.metrics === "object" ? Object.values(v.metrics) as { value: unknown }[] : [];
    if (!metrics.some(m => typeof m?.value === "number") || metrics.some(m => m?.value !== null && (typeof m?.value !== "number" || !Number.isFinite(m.value) || m.value < 0))) return "Enter a nonnegative value";
  }
  return null;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return reply(503, { error: "Surveys are temporarily unavailable" });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const text = await req.text();
    if (text.length > 100000) return reply(413, { error: "Response is too large" });
    const parsed = commands.safeParse(JSON.parse(text));
    if (!parsed.success) return reply(400, { error: "Invalid survey request" });
    const b = parsed.data;
    if (b.action === "create" || b.action === "revoke") {
      const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (!jwt) return reply(401, { error: "Open your workspace first" });
      const { data: auth } = await admin.auth.getUser(jwt);
      if (!auth.user) return reply(401, { error: "Open your workspace first" });
      const id = b.action === "create" ? b.assessment_id : (await admin.from("customer_surveys").select("assessment_id").eq("id", b.survey_id).maybeSingle()).data?.assessment_id;
      const { data: a } = await admin.from("assessments").select("project_id").eq("id", id).maybeSingle();
      if (!a) return reply(404, { error: "Assessment not found" });
      const { data: member } = await admin.from("project_members").select("role").eq("project_id", a.project_id).eq("user_id", auth.user.id).maybeSingle();
      if (!member || !["engagement_lead", "solution_architect"].includes(member.role)) return reply(403, { error: "Only the assessment team can share surveys" });
      if (b.action === "revoke") {
        const { error } = await admin.from("customer_surveys").update({ revoked_at: new Date().toISOString() }).eq("id", b.survey_id);
        if (error) throw error;
        return reply(200, { revoked: true });
      }
      const { count } = await admin.from("customer_surveys").select("id", { count: "exact", head: true }).eq("created_by", auth.user.id).gte("created_at", new Date(Date.now() - 3600000).toISOString());
      if ((count ?? 0) >= 30) return reply(429, { error: "Too many survey links created. Please try later." });
      const token = createCapability();
      const ids = bank.questions.filter(q => q.customerVisible && (b.scope === "full" || bank.quickStart.includes(q.id))).map(q => q.id);
      const { data, error } = await admin.from("customer_surveys").insert({ assessment_id: b.assessment_id, recipient_label: b.recipient_label, scope: b.scope, question_ids: ids, token_hash: await hash(token), created_by: auth.user.id }).select("id,expires_at").single();
      if (error) throw error;
      return reply(200, { ...data, token });
    }
    if (!isCapability(b.token)) return reply(401, { error: "This survey link is invalid" });
    const { data: s, error } = await admin.from("customer_surveys").select("*").eq("token_hash", await hash(b.token)).maybeSingle();
    if (error) throw error;
    if (!s || s.revoked_at || Date.parse(s.expires_at) <= Date.now()) return reply(410, { error: "This survey link has expired or been closed. Ask your assessment team for a new link." });
    if (b.action === "load") {
      const { data: a } = await admin.from("assessments").select("name").eq("id", s.assessment_id).single();
      return reply(200, { name: a?.name ?? "Migration discovery", question_ids: s.question_ids, responses: s.responses, respondent_email: s.respondent_email, submitted_at: s.submitted_at, row_version: s.row_version });
    }
    if (!surveyIsOpen(s)) return reply(409, { error: "This survey has already been submitted" });
    let responses = s.responses;
    if (b.action === "save") {
      if (!allowedSurveyQuestion(b.question_id, s.question_ids)) return reply(403, { error: "Question is not included in this survey" });
      const invalid = validResponse(b.question_id, b.response);
      if (invalid) return reply(400, { error: invalid });
      responses = { ...responses, [b.question_id]: { ...b.response, value: b.response.state === "unknown" ? null : b.response.value } };
    } else if (s.question_ids.some((id: string) => !responses[id])) return reply(400, { error: "Answer every question before submitting; use Unknown when you are unsure." });
    const { data: saved, error: updateError } = await admin.from("customer_surveys").update({ responses, respondent_email: b.email, row_version: s.row_version + 1, ...(b.action === "submit" ? { submitted_at: new Date().toISOString() } : {}) }).eq("id", s.id).eq("row_version", b.expected_version).is("revoked_at", null).is("submitted_at", null).select("row_version,submitted_at").maybeSingle();
    if (updateError) throw updateError;
    if (!saved) return reply(409, { error: "This survey changed in another tab. Reload before continuing." });
    return reply(200, saved);
  } catch {
    return reply(500, { error: "Could not save the survey. Please try again." });
  }
});