export type ProjectRole = "engagement_lead" | "solution_architect" | "customer_contributor" | "customer_reviewer" | "internal_viewer";
export const ROLE_LABEL: Record<ProjectRole, string> = {
  engagement_lead: "Engagement lead",
  solution_architect: "Solution architect",
  customer_contributor: "Customer contributor",
  customer_reviewer: "Customer reviewer",
  internal_viewer: "Internal viewer",
};
export interface Customer { id: string; code: string; name: string; industry: string; region: string; description: string; is_demo: boolean; archived: boolean; created_at: string; updated_at: string }
export interface Project { id: string; customer_id: string; code: string; name: string; is_demo: boolean; ai_processing_enabled: boolean; retention_note: string; archived: boolean; created_at: string; updated_at: string }
export interface Member { id: string; project_id: string; user_id: string; role: ProjectRole; can_view_commercials: boolean; assigned_modules: string[]; assigned_registers: string[]; created_at: string }
export interface Assessment {
  id: string; project_id: string; code: string; name: string; stage: string; template_version: string; rubric_version: string; rule_version: string;
  target_product_name: string; target_release: string; entitlement_notes: string; locale: string; timezone: string;
  decision_weights: Record<string, number>; bulk_na: Record<string, string>; created_at: string; updated_at: string;
}
export const STAGES: { value: string; label: string }[] = [
  { value: "discovery", label: "Discovery" }, { value: "architect_review", label: "Architect review" },
  { value: "customer_validation", label: "Customer validation" }, { value: "proposal", label: "Proposal" },
  { value: "baselined", label: "Baselined" }, { value: "archived", label: "Archived" },
];
export interface RegisterItem { id: string; assessment_id: string; project_id: string; register_type: string; code: string; title: string; data: Record<string, any>; status: string; review_status: string; linked_question_ids: string[]; visibility: "customer" | "internal"; archived: boolean; row_version: number; updated_at: string }
export interface Requirement { id: string; assessment_id: string; project_id: string; code: string; title: string; requirement_type: string; axis: number; priority: "must" | "should" | "could" | "out"; applicability: "applicable" | "unresolved" | "not_applicable"; critical: boolean; current_behavior: string; future_behavior: string; acceptance_criteria: string; scope: string; wave: string; current_score: number | null; target_score: number | null; proposed_coverage: number | null; score_reviewed: boolean; score_rationale: string; linked_question_ids: string[]; visibility: "customer" | "internal"; archived: boolean }
export interface Mapping { id: string; code: string; domain: string; legacy_area: string; candidate_target: string; discovery_proof: string; target_api_names: string; api_names_validated: boolean; disposition: string; fit_status: string; entitlement_status: string; release_availability: string; validation_date: string | null; poc_result: string; architect_rationale: string; verified_by: string | null; gap_category: string; business_impact: string; requirement_ids: string[]; artifact_ids: string[]; scenario_ids: string[]; linked_question_ids: string[]; work_package_id: string | null; is_seed_prompt: boolean; visibility: "customer" | "internal"; archived: boolean; assessment_id: string; project_id: string }
export interface Finding { id: string; assessment_id: string; project_id: string; code: string; rule_id: string; finding_key: string; rule_version: string; analysis_run_id: string | null; title: string; domain: string; kinds: string[]; categories: string[]; current_state: string; required_state: string; delta_type: string; fit_status: string; proposed_treatment: string; confidence: string; impact: number | null; urgency: number | null; delivery_risk: number | null; dependency_criticality: number | null; is_blocker: boolean; status: string; decision: string; decision_rationale: string; needs_review: boolean; owner_label: string; due_date: string | null; validation_task: string; acceptance_criterion: string; evidence_note: string; internal_wording: string; work_package_id: string | null; linked_question_ids: string[]; source_answer_versions: Record<string, number>; visibility: "customer" | "internal"; manual: boolean; updated_at: string }
export interface WorkPackage { id: string; assessment_id: string; project_id: string; code: string; name: string; workstream: string; wave: string; required: boolean; conditional: boolean; deliverables: string; acceptance_criteria: string; dependencies: string; customer_responsibilities: string; assumptions: string; role_mix: Record<string, number>; requirement_ids: string[]; finding_ids: string[]; visibility: "customer" | "internal"; archived: boolean }
export interface EstimateLineRow { id: string; work_package_id: string; unit_type: string; description: string; quantity_mode: "exact" | "band"; qty_low: number | null; qty_likely: number | null; qty_high: number | null; hours_low: number | null; hours_likely: number | null; hours_high: number | null; allocation_pct: number; is_fixed_task: boolean; basis: string }
export interface CommercialInputs { id: string; assessment_id: string; project_id: string; currency: string | null; contingency_model: "none" | "percentage" | "risk_hours"; contingency_pct: number | null; risk_hours_low: number | null; risk_hours_likely: number | null; risk_hours_high: number | null; rom_selected: boolean; rom_basis: string; role_rates: Record<string, number>; role_split: Record<string, number>; hours_per_person_week: number | null; target_weeks: number | null; customer_sme_capacity: string; expenses_note: string; margin_note: string }
export interface Strategy { id: string; name: string; design_strategy: string; deployment_model: string; rollout_pattern: string; details: Record<string, string>; criteria_scores: Record<string, number>; is_recommended: boolean; recommendation_rationale: string; approved_by: string | null; approved_at: string | null }
export interface Snapshot { id: string; kind: string; name: string; template_version: string; rubric_version: string; rule_version: string; payload: any; payload_hash: string; created_at: string; created_by: string }
export interface Evidence { id: string; question_id: string | null; target_type: string | null; target_id: string | null; storage_path: string; original_filename: string; mime_type: string; size_bytes: number; checksum: string; classification: string; version: number; replaces_id: string | null; status: string; description: string; uploaded_by: string; created_at: string }
export interface Assignment { id: string; question_id: string | null; kind: string; assignee_label: string; note: string; due_date: string | null; status: string; created_at: string }
export interface CommentRow { id: string; target_type: string; target_id: string; body: string; visibility: string; author: string; created_at: string }

export const FIT_STATUSES: { value: string; label: string; tone: string }[] = [
  { value: "candidate_fit", label: "Candidate fit", tone: "info" },
  { value: "verified_native_fit", label: "Verified native fit", tone: "success" },
  { value: "configuration_required", label: "Configuration required", tone: "teal" },
  { value: "extension_required", label: "Extension required", tone: "warning" },
  { value: "third_party_dependency", label: "Third-party dependency", tone: "demo" },
  { value: "known_unmet", label: "Known unmet requirement", tone: "destructive" },
  { value: "validation_pending", label: "Validation pending", tone: "muted" },
  { value: "out_of_scope", label: "Out of scope", tone: "outline" },
];
export const DISPOSITIONS = ["reuse after proof", "reconfigure", "transform/migrate", "redesign", "rebuild", "replace", "retire", "archive/reference", "retain in legacy temporarily", "unresolved"];
export const ENTITLEMENT = ["unconfirmed", "purchased", "quoted", "under_evaluation", "unavailable"];
export const fitLabel = (v: string) => FIT_STATUSES.find((f) => f.value === v)?.label ?? v;
