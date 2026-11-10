import raw from "./questionBank.data.json";
import type { ModuleDefinition, Option, QuestionDefinition, Rule, SubField } from "./types";

export const TEMPLATE_VERSION = raw.templateVersion;
export const QUICK_START_IDS: string[] = raw.quickStart;

const o = (labels: string[]): Option[] =>
  labels.map((l) => ({ value: l.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), label: l }));

export const OPTION_SETS: Record<string, { label: string; options: Option[]; note?: string }> = {
  YN: { label: "Yes / No", options: o(["Yes", "No"]), note: "Unknown and N/A are answer states, not options." },
  SCOPE: { label: "Scope", options: o(["In initial migration", "Later phase", "Retain existing system", "Dependency only", "Retire"]) },
  MODE: { label: "Operating mode", options: o(["Manual", "Mostly manual", "Mixed manual and automated", "Mostly automated", "Automated with exception handling"]) },
  HEALTH: { label: "Documentation health", options: o(["Documented and tested", "Documented only", "Partially documented", "Undocumented"]) },
  PRIORITY: { label: "Priority", options: o(["Must have", "Should have", "Could have", "Out of scope"]) },
  FREQUENCY: { label: "Frequency", options: o(["Per transaction", "Daily", "Weekly", "Monthly", "Quarterly", "On demand"]) },
  COUNT: { label: "Count band", options: [
    { value: "0", label: "0" }, { value: "1-10", label: "1–10" }, { value: "11-50", label: "11–50" },
    { value: "51-200", label: "51–200" }, { value: "201-1000", label: "201–1,000" }, { value: "1001-10000", label: "1,001–10,000" },
    { value: "10001-100000", label: "10,001–100,000" }, { value: "100001+", label: "More than 100,000" }],
    note: "Exact nonnegative integer or estimated band; min/max preserved." },
  COMPLEXITY: { label: "Complexity", options: o(["1 Minimal", "2 Low", "3 Moderate", "4 High", "5 Very high"]), note: "Consultant-rated with rationale; never a customer self-score." },
  REQUIREMENT: { label: "Requirement type", options: o(["Business rule", "Functional", "Data", "Integration", "Reporting", "Security", "Performance", "Operational", "Adoption"]) },
};

export const COUNT_BANDS: Record<string, { min: number; max: number | null }> = {
  "0": { min: 0, max: 0 }, "1-10": { min: 1, max: 10 }, "11-50": { min: 11, max: 50 }, "51-200": { min: 51, max: 200 },
  "201-1000": { min: 201, max: 1000 }, "1001-10000": { min: 1001, max: 10000 }, "10001-100000": { min: 10001, max: 100000 },
  "100001+": { min: 100001, max: null },
};

const MODULE_COPY: Record<string, { help: string; why: string; example: string }> = {
  B: { help: "Business intent, scope and decision ownership for the programme.", why: "Scope and outcomes drive every later sizing, routing and priority decision.", example: "Reduce quote turnaround from 3 days to 1 day for direct sellers by Q3." },
  L: { help: "What is actually installed and licensed today and what is confirmed for the target.", why: "Product names do not prove entitlement; the source path and licences determine which assessment template applies.", example: "SBQQ package 242.x verified from Installed Packages on 2 Nov; target SKU under evaluation." },
  C: { help: "How products, bundles, attributes and configuration rules are modelled today.", why: "Catalog structure is redesigned, not copied; nesting and rule depth drive configurator proof and effort.", example: "1,240 active SKUs, 3-level nested bundles for site packages, 40 product rules." },
  P: { help: "How prices, discounts and calculations are produced today.", why: "Pricing parity is proven with real quotes; custom code must be decomposed by business purpose.", example: "QCP adds partner uplift and rounds to 2 decimals after bundle allocation." },
  Q: { help: "How sellers build, approve and progress quotes.", why: "Seller workload, channels and approvals shape UX, performance proof and adoption plan.", example: "Peak 400 quotes/day; P95 of 120 lines; Advanced Approvals with 6 chains." },
  K: { help: "Documents, contracts and signature tooling attached to quotes.", why: "Templates and signature flows are typically rebuilt and need legal regression testing.", example: "5 quote templates in 3 languages, DocuSign envelopes sent from the quote." },
  A: { help: "Subscriptions, assets and the lifecycle of amendments and renewals.", why: "Lifecycle continuity is the hardest migration risk; the first post-migration renewal must work.", example: "Amendment history missing for 2019–2020 contracts; co-termed renewals by account." },
  O: { help: "How quotes become orders and reach fulfilment.", why: "Order activation and downstream effects must be redesigned and reconciled.", example: "Orders created on quote acceptance and sent to ERP via middleware." },
  U: { help: "Billing, usage, tax and finance boundaries touching CPQ.", why: "Finance scope must be explicit; a dependency does not silently add billing replacement to scope.", example: "Invoicing stays in ERP; usage rated externally and posted monthly." },
  I: { help: "Systems that exchange quote, product, order or lifecycle data.", why: "Interfaces referencing package objects or APIs need contract remapping and external commitment.", example: "ERP order interface reads SBQQ__Quote__c fields via REST." },
  X: { help: "Custom code, automation, packages and release practices that depend on CPQ.", why: "Dependent components must be inventoried and refactored with tests.", example: "38 Apex classes and 12 Flows reference SBQQ objects." },
  D: { help: "Data to migrate, its quality, mapping and reconciliation.", why: "Volumes and measured quality issues drive cleansing, sizing and cutover design.", example: "1.2M quote lines; 3% orphan subscriptions measured in a 10k sample." },
  R: { help: "Reports, metrics and analytics built on CPQ records.", why: "Metric definitions need a history bridge so before/after results can be compared.", example: "ARR dashboard in Tableau built on SBQQ__Subscription__c." },
  S: { help: "Access, security, data handling and operational resilience.", why: "Sensitive prices, costs and partner visibility need a reviewed least-privilege design.", example: "Partners must not see cost or margin fields; SSO with MFA." },
  T: { help: "Testing, cutover, rollout, adoption and proposal constraints.", why: "Test evidence and rollout choices determine readiness gates and delivery shape.", example: "60 golden transactions agreed with pricing team; BU waves preferred." },
};

// Typed overrides where the brief specifies structured sub-details
const SUBFIELD_OVERRIDES: Record<string, SubField[]> = {
  B02: [
    { key: "kpi", label: "KPI", type: "select", options: o(["Quote turnaround", "Quote error rate", "Approval turnaround", "Discount leakage", "Renewal timeliness", "Seller adoption", "Other"]) },
    { key: "baseline", label: "Baseline (leave blank if not measured)" }, { key: "unit", label: "Unit" },
    { key: "measurement_source", label: "Measurement source" }, { key: "target", label: "Target" },
    { key: "target_date", label: "Target date", type: "date" }, { key: "owner", label: "Owner" }],
  L03: [
    { key: "target_product", label: "Target product / SKU" },
    { key: "entitlement_status", label: "Entitlement status", type: "select", options: o(["Purchased", "Quoted", "Under evaluation", "Unavailable"]) },
    { key: "feature_permissions", label: "Feature permissions" }, { key: "user_counts", label: "User counts", type: "number" },
    { key: "usage_limits", label: "Usage limits (if known)" }, { key: "reference", label: "Order form / reference" },
    { key: "validation_owner", label: "Validation owner" }, { key: "validation_date", label: "Validation date", type: "date" }],
  A08: [
    { key: "cohort", label: "Cohort", type: "select", options: o(["Pending amendment", "Renewal opportunity", "Unsigned quote", "Cancellation", "Future-dated order"]) },
    { key: "count", label: "Count", type: "number" },
    { key: "treatment", label: "Transition treatment", type: "select", options: o(["Complete in legacy", "Recreate in target", "Migrate with validation", "Hold for decision"]) },
    { key: "owner", label: "Decision owner" }, { key: "decision_date", label: "Decision date", type: "date" }],
  I02: [
    { key: "interface", label: "Interface name" },
    { key: "direction", label: "Direction", type: "select", options: o(["Inbound", "Outbound", "Bidirectional"]) },
    { key: "objects", label: "Objects" }, { key: "operation_event", label: "Operation / event" },
    { key: "endpoints", label: "Current endpoints" }, { key: "schema_ref", label: "Payload / schema reference" },
    { key: "business_process", label: "Business process" }, { key: "external_owner", label: "External owner" }],
  T02: [
    { key: "transaction", label: "Golden transaction" },
    { key: "kind", label: "Type", type: "select", options: o(["Normal", "Edge", "Negative"]) },
    { key: "persona_channel", label: "Persona / channel" }, { key: "dataset", label: "Dataset" },
    { key: "expected_output", label: "Expected output" }, { key: "tolerance", label: "Tolerance" }, { key: "owner", label: "Owner" }],
  T09: [
    { key: "item", label: "Decision / assumption" }, { key: "impact", label: "Impact" }, { key: "owner", label: "Owner" },
    { key: "due", label: "Due date", type: "date" }, { key: "validation_plan", label: "Validation plan" },
    { key: "effect", label: "Possible scope / cost / schedule effect" },
    { key: "customer_visible", label: "Customer visible", type: "select", options: o(["Yes", "No"]) }],
};

const PER_OPTION: Record<string, { label: string; options: Option[] }> = {
  B03: { label: "Scope", options: OPTION_SETS.SCOPE.options },
  D01: { label: "Treatment", options: o(["Migrate", "Reference / archive", "Retain legacy", "Recreate", "Retire", "Undecided"]) },
  U01: { label: "Scope", options: OPTION_SETS.SCOPE.options },
};

// Declarative visibility. Module-level rules apply to every question in the module unless a question rule overrides.
export const MODULE_RULES: Record<string, Rule> = {
  A: { op: "any", rules: [
    { op: "contains", q: "C02", values: ["recurring", "hybrid", "ramped_multi_period", "usage"] },
    { op: "contains", q: "B03", values: ["assets_subscriptions", "amendments_renewals"] },
    { op: "contains", q: "A01", values: ["renew", "upsell", "downsell", "cancel", "suspend_resume", "swap", "transfer", "split_merge", "early_termination", "evergreen"] }] },
  K: { op: "contains", q: "B03", values: ["documents", "contracts", "configure_price_quote"] },
  O: { op: "any", rules: [{ op: "contains", q: "B03", values: ["orders", "orchestration"] }, { op: "known", q: "L06" }] },
};

export const QUESTION_RULES: Record<string, Rule> = {
  // Routing questions (quick start) are always visible.
  C06: { op: "known", q: "C01" },
  P02: { op: "known", q: "P01" },
  Q07: { op: "not", rule: { op: "equals", q: "Q06", value: "none" } },
  U04: { op: "all", rules: [{ op: "known", q: "U03" }, { op: "not", rule: { op: "equals", q: "U03", value: "none" } }] },
  I02: { op: "known", q: "I01" }, I03: { op: "known", q: "I01" }, I04: { op: "known", q: "I01" },
  I05: { op: "known", q: "I01" }, I08: { op: "known", q: "I01" },
  X02: { op: "not", rule: { op: "equals", q: "X01", value: "none" } },
  X03: { op: "not", rule: { op: "equals", q: "X01", value: "none" } },
  X08: { op: "not", rule: { op: "equals", q: "X01", value: "none" } },
  D02: { op: "known", q: "D01" }, D05: { op: "known", q: "D01" },
  L09: { op: "known", q: "L03" },
};

type RawQ = (typeof raw.questions)[number];

function build(q: RawQ): QuestionDefinition {
  const copy = MODULE_COPY[q.module];
  const subfields = (SUBFIELD_OVERRIDES[q.id] ?? (q.subfields as SubField[])).map((s) => ({ type: "text" as const, ...s }));
  const evidence = q.evidenceRequired ? " Evidence is required before a linked finding can be verified." : "";
  return {
    id: q.id,
    templateVersion: TEMPLATE_VERSION,
    module: q.module,
    axis: q.axis,
    label: q.label,
    detail: q.detail,
    help: `${copy.help} ${q.detail}`,
    whyItMatters: copy.why + evidence,
    example: copy.example,
    control: q.control as QuestionDefinition["control"],
    optionSet: q.optionSet,
    options: q.options,
    subfields,
    perOption: PER_OPTION[q.id],
    requiredWhenApplicable: !["B07", "T08"].includes(q.id),
    visibilityRule: q.quickStart ? undefined : QUESTION_RULES[q.id] ?? MODULE_RULES[q.module],
    evidenceRequired: q.evidenceRequired,
    defaultOwnerRole: q.defaultOwnerRole,
    criticality: q.criticality as QuestionDefinition["criticality"],
    customerVisible: q.customerVisible,
    quickStart: q.quickStart,
    noneExclusive: q.noneExclusive,
    rank: q.rank,
  };
}

export const MODULES: ModuleDefinition[] = raw.modules.map((m) => ({ ...m, visibilityRule: MODULE_RULES[m.code] }));
export const QUESTIONS: QuestionDefinition[] = raw.questions.map(build);
export const QUESTION_BY_ID: Record<string, QuestionDefinition> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const INTERNAL_QUESTION_IDS = QUESTIONS.filter((q) => !q.customerVisible).map((q) => q.id);
export const questionsForModule = (code: string) => QUESTIONS.filter((q) => q.module === code);
export const moduleByCode = (code: string) => MODULES.find((m) => m.code === code)!;
export const optionLabel = (qid: string, value: string) =>
  QUESTION_BY_ID[qid]?.options.find((x) => x.value === value)?.label ?? value;
