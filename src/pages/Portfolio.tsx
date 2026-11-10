import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, FlaskConical, History as HistoryIcon, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, must } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import { CreateAssessmentDialog } from "@/components/app/CreateAssessmentDialog";
import { DemoBadge, EmptyState, Pill, fmtDate, fmtPct } from "@/components/app/bits";
import { STAGES, type Assessment, type Customer, type Project } from "@/lib/models";
import { computeCoverage } from "@/domain/coverage";
import type { AnswerMap } from "@/domain/types";
import { seedDemo } from "@/domain/demoSeed";

interface Row { a: Assessment; p: Project; c: Customer; cov: number | null; unknowns: number; lastActivity: string; flagged: number }

export default function Portfolio() {
  const { user, isInternal, profile } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState(""); const [stage, setStage] = useState("all"); const [filter, setFilter] = useState("all");
  const [demoBusy, setDemoBusy] = useState(false);

  const data = useQuery({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      const [cs, ps, as, st] = await Promise.all([
        must<Customer[]>(db.from("customers").select("*")),
        must<Project[]>(db.from("projects").select("*")),
        must<Assessment[]>(db.from("assessments").select("*").order("updated_at", { ascending: false })),
        must<{ assessment_id: string; updated_at: string; last_question_id: string | null; last_view: string }[]>(db.from("user_assessment_state").select("*").eq("user_id", user!.id).order("updated_at", { ascending: false }).limit(1)),
      ]);
      const ids = as.map((a) => a.id);
      const ans = ids.length ? await must<{ assessment_id: string; question_id: string; state: string; row_version: number; review_status: string; updated_at: string; value: unknown; needs_revalidation: boolean }[]>(
        db.from("answers").select("assessment_id,question_id,state,row_version,review_status,updated_at,value,needs_revalidation").in("assessment_id", ids).eq("instance_key", "")) : [];
      const rows: Row[] = as.map((a) => {
        const p = ps.find((x) => x.id === a.project_id)!; const c = cs.find((x) => x.id === p?.customer_id)!;
        const mine = ans.filter((x) => x.assessment_id === a.id);
        const map: AnswerMap = Object.fromEntries(mine.map((x) => [x.question_id, x as never]));
        const cov = computeCoverage(map, new Set(), { bulkNa: a.bulk_na });
        const last = mine.reduce((m, x) => (x.updated_at > m ? x.updated_at : m), a.updated_at);
        return { a, p, c, cov: cov.answerPct, unknowns: cov.answeredUnknown, lastActivity: last, flagged: mine.filter((x) => x.needs_revalidation).length };
      }).filter((r) => r.p && r.c);
      return { rows, last: st[0] };
    },
    enabled: !!user,
  });

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data.data?.rows ?? []).filter((r) => {
      if (stage !== "all" && r.a.stage !== stage) return false;
      if (filter === "unknowns" && r.unknowns === 0) return false;
      if (filter === "awaiting" && r.a.stage !== "customer_validation") return false;
      if (filter === "flagged" && r.flagged === 0) return false;
      if (!s) return true;
      return [r.c.name, r.c.code, r.p.name, r.p.code, r.a.name, r.a.code, r.a.stage, r.c.industry, r.c.region].some((x) => x?.toLowerCase().includes(s));
    });
  }, [data.data, q, stage, filter]);

  const resume = data.data?.last;
  const explore = async () => {
    setDemoBusy(true);
    try {
      const { data: r, error } = await db.rpc("join_demo_project");
      if (error) throw error;
      if (r.needs_seed) await seedDemo(r.assessment_id, r.project_id, user!.id);
      qc.invalidateQueries();
      nav(`/a/${r.assessment_id}`);
    } catch (e) { toast.error((e as Error).message); } finally { setDemoBusy(false); }
  };

  return (
    <div className="container py-8">
      <section className="card-elevated p-6 md:p-8 bg-gradient-to-br from-card to-secondary/60">
        <p className="kicker">Revenue Cloud Migration Discovery Studio</p>
        <h1 className="text-3xl font-bold mt-2">Good to see you{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">Run conditional discovery, capture evidence, map current to future design and produce a traceable assessment — from legacy Salesforce CPQ (SBQQ) to Revenue Cloud.</p>
        <div className="flex flex-wrap gap-3 mt-6">
          {isInternal ? (
            <CreateAssessmentDialog trigger={<Button size="lg"><Plus className="h-4 w-4 mr-1" />Create customer assessment</Button>} />
          ) : (
            <Button size="lg" disabled title="Only internal team members can create assessments"><Plus className="h-4 w-4 mr-1" />Create customer assessment</Button>
          )}
          <Button size="lg" variant="outline" disabled={!resume} onClick={() => resume && nav(`/a/${resume.assessment_id}/discovery${resume.last_question_id ? `?q=${resume.last_question_id}&view=${resume.last_view}` : ""}`)}>
            <HistoryIcon className="h-4 w-4 mr-1" />Resume last assessment
          </Button>
          <Button size="lg" variant="secondary" onClick={explore} disabled={demoBusy}><FlaskConical className="h-4 w-4 mr-1" />{demoBusy ? "Preparing demo…" : "Explore demo"}</Button>
        </div>
        {!isInternal && <p className="text-xs text-muted-foreground mt-3">You have customer access: you'll see projects you've been invited to.</p>}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-bold mr-auto">Assessments</h2>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
            <Input aria-label="Search assessments" placeholder="Search customer, project, ID, stage…" className="pl-8 w-72" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-44" aria-label="Stage"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All stages</SelectItem>{STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56" aria-label="Quick filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assessments</SelectItem>
              <SelectItem value="awaiting">Awaiting customer input</SelectItem>
              <SelectItem value="unknowns">With unknown answers</SelectItem>
              <SelectItem value="flagged">Answers needing revalidation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data.isLoading ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? (
          <EmptyState title="No assessments yet">Create a customer assessment, or explore the synthetic demo to see a complete walkthrough.</EmptyState>
        ) : (
          <div className="card-elevated overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr><th className="p-3">Customer</th><th className="p-3">Assessment</th><th className="p-3">Stage</th><th className="p-3">Answer coverage</th><th className="p-3">Unknowns</th><th className="p-3">Last activity</th><th className="p-3 sr-only">Open</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.a.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="p-3"><Link to={`/customers/${r.c.id}`} className="font-medium hover:underline">{r.c.name}</Link> {r.c.is_demo && <DemoBadge />}<div className="text-xs text-muted-foreground">{r.c.code} · {r.p.name}</div></td>
                    <td className="p-3">{r.a.name}<div className="text-xs text-muted-foreground font-mono">{r.a.code}</div></td>
                    <td className="p-3"><Pill tone="teal">{STAGES.find((s) => s.value === r.a.stage)?.label}</Pill></td>
                    <td className="p-3">{fmtPct(r.cov)}</td>
                    <td className="p-3">{r.unknowns ? <Pill tone="warning">{r.unknowns}</Pill> : "—"}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(r.lastActivity)}</td>
                    <td className="p-3 text-right"><Button asChild size="sm" variant="ghost"><Link to={`/a/${r.a.id}`} aria-label={`Open ${r.a.name}`}>Open<ArrowRight className="h-4 w-4 ml-1" /></Link></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
