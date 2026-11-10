export type ControlType = "single" | "multi" | "count" | "number" | "date" | "dateRange" | "text" | "repeatable" | "table";
export type AnswerState = "known" | "unknown" | "needs_validation" | "not_applicable";
export type Confidence = "self_reported" | "documented" | "tested";
export type ReviewStatus = "draft" | "submitted" | "reviewed" | "disputed";

export interface Option { value: string; label: string }
export interface SubField { key: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea"; options?: Option[] }

export interface QuestionDefinition {
  id: string;
  templateVersion: string;
  module: string;
  axis: number;
  label: string;
  detail: string;
  help: string;
  whyItMatters: string;
  example: string;
  control: ControlType;
  optionSet?: string | null;
  options: Option[];
  subfields: SubField[];
  perOption?: { label: string; options: Option[] };
  requiredWhenApplicable: boolean;
  visibilityRule?: Rule;
  evidenceRequired: boolean;
  defaultOwnerRole: string;
  criticality: "normal" | "high" | "gate";
  customerVisible: boolean;
  quickStart: boolean;
  noneExclusive: boolean;
  rank: boolean;
}

export interface ModuleDefinition { code: string; name: string; owner: string; axisText: string; axis: number; visibilityRule?: Rule }

export type Rule =
  | { op: "equals"; q: string; value: string }
  | { op: "in"; q: string; values: string[] }
  | { op: "contains"; q: string; values: string[] }
  | { op: "greater_than"; q: string; value: number }
  | { op: "known"; q: string }
  | { op: "confirmed_not_applicable"; q: string }
  | { op: "not"; rule: Rule }
  | { op: "any"; rules: Rule[] }
  | { op: "all"; rules: Rule[] };

export interface CountValue { mode: "exact" | "estimate" | "band"; exact?: number | null; band?: string | null; min?: number | null; max?: number | null }
export interface AnswerValue {
  selected?: string | string[];
  other?: string;
  ranks?: string[];
  perOption?: Record<string, string>;
  details?: Record<string, string>;
  count?: CountValue;
  metrics?: Record<string, { value: number | null; status: "exact" | "estimated" }>;
  start?: string; end?: string; reason?: string;
  items?: { id: string; fields: Record<string, string> }[];
  text?: string;
}

export interface AnswerRow {
  id: string;
  assessment_id: string;
  project_id: string;
  question_id: string;
  instance_key: string;
  state: AnswerState;
  value: AnswerValue | null;
  notes: string | null;
  na_reason: string | null;
  confidence: Confidence;
  review_status: ReviewStatus;
  owner_label: string | null;
  due_date: string | null;
  needs_revalidation: boolean;
  row_version: number;
  updated_by: string;
  updated_at: string;
}

export type AnswerMap = Record<string, Pick<AnswerRow, "state" | "value" | "row_version" | "review_status"> & Partial<AnswerRow>>;
