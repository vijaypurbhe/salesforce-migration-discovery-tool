import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import type { AnswerMap, AnswerRow, AnswerState, AnswerValue, Confidence } from "@/domain/types";
import { QUESTION_BY_ID } from "@/domain/questionBank";
import { validateValue } from "@/components/discovery/AnswerControl";
import { reactivatedQuestions } from "@/domain/branching";

export interface Draft { state: AnswerState | null; value: AnswerValue; notes: string; na_reason: string; confidence: Confidence; owner_label: string; due_date: string }
export type SaveStatus =
  | { kind: "idle" } | { kind: "dirty" } | { kind: "saving" } | { kind: "saved"; at: string }
  | { kind: "invalid"; error: string } | { kind: "failed"; error: string } | { kind: "conflict" };
export interface Conflict { qid: string; theirs: AnswerRow | null; mine: Draft }

export const draftFromRow = (r?: Partial<AnswerRow>): Draft => ({
  state: (r?.state as AnswerState) ?? null, value: (r?.value as AnswerValue) ?? {}, notes: r?.notes ?? "", na_reason: r?.na_reason ?? "",
  confidence: (r?.confidence as Confidence) ?? "self_reported", owner_label: r?.owner_label ?? "", due_date: r?.due_date ?? "",
});

export function useAnswerSaver(assessmentId: string, answers: AnswerMap, announce: (msg: string) => void) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [status, setStatus] = useState<Record<string, SaveStatus>>({});
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const draftsRef = useRef(drafts); draftsRef.current = drafts;
  const answersRef = useRef(answers); answersRef.current = answers;

  const doSave = useCallback(async (qid: string, override?: { draft: Draft; expected: number }) => {
    const d = override?.draft ?? draftsRef.current[qid];
    if (!d || !d.state) return;
    const q = QUESTION_BY_ID[qid];
    if (d.state === "known") {
      const err = validateValue(q, d.value);
      if (err) { setStatus((s) => ({ ...s, [qid]: { kind: "invalid", error: err } })); return; }
    }
    if (d.state === "not_applicable" && !d.na_reason.trim()) { setStatus((s) => ({ ...s, [qid]: { kind: "invalid", error: "Not applicable needs a short reason." } })); return; }
    setStatus((s) => ({ ...s, [qid]: { kind: "saving" } }));
    const before = answersRef.current;
    const expected = override?.expected ?? before[qid]?.row_version ?? 0;
    const value = d.state === "unknown" ? null : d.value;
    const { data, error } = await db.rpc("save_answer", {
      p_assessment: assessmentId, p_question: qid, p_instance: "", p_state: d.state, p_value: value,
      p_notes: d.notes || null, p_na_reason: d.na_reason || null, p_confidence: d.confidence, p_expected_version: expected,
      p_owner: d.owner_label || null, p_due: d.due_date || null,
    });
    if (error) { setStatus((s) => ({ ...s, [qid]: { kind: "failed", error: error.message } })); announce(`Save failed for ${qid}`); return; }
    if (data.status === "conflict") { setStatus((s) => ({ ...s, [qid]: { kind: "conflict" } })); setConflict({ qid, theirs: data.answer, mine: d }); announce(`Conflict on ${qid}`); return; }
    const row = data.answer as AnswerRow;
    qc.setQueryData<AnswerRow[]>(["answers", assessmentId], (old) => {
      const list = (old ?? []).filter((r) => !(r.question_id === qid && r.instance_key === ""));
      return [...list, row];
    });
    const after: AnswerMap = { ...before, [qid]: row };
    const re = reactivatedQuestions(before, after).filter((x) => x !== qid);
    if (re.length) {
      await db.rpc("flag_answers_revalidation", { p_assessment: assessmentId, p_questions: re });
      qc.invalidateQueries({ queryKey: ["answers", assessmentId] });
      announce(`${re.length} previously hidden answer(s) reactivated and flagged for revalidation`);
    }
    // only clear draft if user hasn't typed since
    setDrafts((ds) => (ds[qid] === d ? Object.fromEntries(Object.entries(ds).filter(([k]) => k !== qid)) : ds));
    const at = new Date(row.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setStatus((s) => ({ ...s, [qid]: { kind: "saved", at } }));
    announce(`${qid} saved at ${at}`);
  }, [assessmentId, qc, announce]);

  const setDraft = useCallback((qid: string, d: Draft) => {
    setDrafts((ds) => ({ ...ds, [qid]: d }));
    setStatus((s) => ({ ...s, [qid]: { kind: "dirty" } }));
    clearTimeout(timers.current[qid]);
    timers.current[qid] = setTimeout(() => doSave(qid), 900);
  }, [doSave]);

  const flushAll = useCallback(async () => {
    const ids = Object.keys(timers.current);
    ids.forEach((id) => clearTimeout(timers.current[id]));
    timers.current = {};
    await Promise.all(Object.keys(draftsRef.current).map((id) => doSave(id)));
  }, [doSave]);

  const resolveConflict = useCallback(async (choice: "mine" | "theirs", merged?: Draft) => {
    if (!conflict) return;
    const { qid, theirs, mine } = conflict;
    setConflict(null);
    if (choice === "theirs") {
      setDrafts((ds) => Object.fromEntries(Object.entries(ds).filter(([k]) => k !== qid)));
      qc.invalidateQueries({ queryKey: ["answers", assessmentId] });
      setStatus((s) => ({ ...s, [qid]: { kind: "idle" } }));
    } else {
      await doSave(qid, { draft: merged ?? mine, expected: theirs?.row_version ?? 0 });
    }
  }, [conflict, doSave, qc, assessmentId]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (Object.keys(draftsRef.current).length) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  return { drafts, status, setDraft, save: doSave, flushAll, conflict, resolveConflict };
}
