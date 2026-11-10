import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, must } from "@/lib/db";
import { useAuth } from "./AuthContext";
import type { Assessment, Customer, Member, Project } from "@/lib/models";
import type { AnswerMap, AnswerRow } from "@/domain/types";

export interface Me {
  role: Member["role"] | null;
  canEditInternal: boolean;
  isInternal: boolean;
  isLead: boolean;
  canViewCommercials: boolean;
  canAnswer: (questionId: string) => boolean;
  canWriteRegister: (type: string) => boolean;
  readOnly: boolean;
}

interface Ctx {
  assessment: Assessment; project: Project; customer: Customer; me: Me;
  answers: AnswerMap; answerRows: AnswerRow[]; evidencedIds: Set<string>;
  refetchAnswers: () => void; invalidate: (key: string) => void;
}
const C = createContext<Ctx | null>(null);

export function useAssessmentBundle(assessmentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assessment", assessmentId],
    enabled: !!assessmentId && !!user,
    queryFn: async () => {
      const a = await must<Assessment>(db.from("assessments").select("*").eq("id", assessmentId).single());
      const [p, m] = await Promise.all([
        must<Project>(db.from("projects").select("*").eq("id", a.project_id).single()),
        must<Member | null>(db.from("project_members").select("*").eq("project_id", a.project_id).eq("user_id", user!.id).maybeSingle()),
      ]);
      const c = await must<Customer>(db.from("customers").select("*").eq("id", p.customer_id).single());
      return { assessment: a, project: p, customer: c, member: m };
    },
  });
}

export function AssessmentProvider({ assessmentId, children }: { assessmentId: string; children: ReactNode }) {
  const qc = useQueryClient();
  const bundle = useAssessmentBundle(assessmentId);
  const answersQ = useQuery({
    queryKey: ["answers", assessmentId],
    queryFn: () => must<AnswerRow[]>(db.from("answers").select("*").eq("assessment_id", assessmentId)),
  });
  const evQ = useQuery({
    queryKey: ["evidence", assessmentId],
    queryFn: () => must<{ question_id: string | null; status: string }[]>(db.from("evidence_files").select("question_id,status").eq("assessment_id", assessmentId)),
  });

  const value = useMemo<Ctx | null>(() => {
    if (!bundle.data) return null;
    const m = bundle.data.member;
    const role = m?.role ?? null;
    const isInternal = role === "engagement_lead" || role === "solution_architect" || role === "internal_viewer";
    const canEditInternal = role === "engagement_lead" || role === "solution_architect";
    const me: Me = {
      role, isInternal, canEditInternal, isLead: role === "engagement_lead",
      canViewCommercials: !!m?.can_view_commercials && isInternal,
      readOnly: role === "customer_reviewer" || role === "internal_viewer" || !role,
      canAnswer: (qid) => canEditInternal || (role === "customer_contributor" && !["B07", "T08"].includes(qid) && ((m?.assigned_modules ?? []).includes(qid[0]) || (m?.assigned_modules ?? []).includes(qid))),
      canWriteRegister: (t) => canEditInternal || (role === "customer_contributor" && (m?.assigned_registers ?? []).includes(t)),
    };
    const rows = answersQ.data ?? [];
    const answers: AnswerMap = {};
    rows.filter((r) => r.instance_key === "").forEach((r) => (answers[r.question_id] = r));
    const evidencedIds = new Set((evQ.data ?? []).filter((e) => e.question_id && e.status !== "rejected" && e.status !== "superseded").map((e) => e.question_id!));
    return {
      assessment: bundle.data.assessment, project: bundle.data.project, customer: bundle.data.customer, me,
      answers, answerRows: rows, evidencedIds,
      refetchAnswers: () => answersQ.refetch(),
      invalidate: (key) => qc.invalidateQueries({ queryKey: [key, assessmentId] }),
    };
  }, [bundle.data, answersQ.data, evQ.data, qc, assessmentId, answersQ]);

  if (bundle.isError) return <div className="p-10 text-destructive" role="alert">This assessment could not be loaded. You may not have access to it.</div>;
  if (!value || answersQ.isLoading) return <div className="p-10 text-muted-foreground" aria-live="polite">Loading assessment…</div>;
  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useAssessment = () => {
  const c = useContext(C);
  if (!c) throw new Error("useAssessment outside provider");
  return c;
};

/** Generic per-assessment table loader. */
export function useAssessmentTable<T>(table: string, assessmentId: string, opts: { order?: string; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [table, assessmentId],
    enabled: opts.enabled ?? true,
    queryFn: () => must<T[]>(db.from(table).select("*").eq("assessment_id", assessmentId).order(opts.order ?? "created_at", { ascending: true })),
  });
}
