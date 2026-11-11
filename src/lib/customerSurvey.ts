import { supabase } from "@/integrations/supabase/client";
import type { AnswerState, AnswerValue } from "@/domain/types";
export interface SurveyResponse { state: AnswerState; value: AnswerValue | null; notes: string; na_reason: string }
export interface SurveyData { name: string; question_ids: string[]; responses: Record<string, SurveyResponse>; respondent_email: string | null; submitted_at: string | null; row_version: number }
export async function surveyRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("customer-survey", { body });
  if (error) {
    let message = "The survey could not be saved. Please try again.";
    if (error.context instanceof Response) {
      const detail = await error.context.json().catch(() => null);
      if (detail?.error) message = detail.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}