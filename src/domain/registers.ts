export interface RegisterField { key: string; label: string; type?: "text" | "number" | "select" | "textarea"; options?: string[] }
export interface RegisterDef { type: string; label: string; prefix: string; questions: string[]; fields: RegisterField[] }

const treatment = ["reuse after proof", "reconfigure", "transform/migrate", "redesign", "rebuild", "replace", "retire", "archive/reference", "retain in legacy temporarily", "unresolved"];

export const REGISTERS: RegisterDef[] = [
  { type: "catalog", label: "Catalog", prefix: "CAT", questions: ["C01", "C02", "C03", "C04"], fields: [
    { key: "family", label: "Family" }, { key: "sku", label: "Product / SKU" }, { key: "status", label: "Active / sold status", type: "select", options: ["active", "inactive", "sold last 12 months"] },
    { key: "bundle_relationships", label: "Bundle relationships" }, { key: "attributes", label: "Attributes" }, { key: "selling_model", label: "Selling model" },
    { key: "source_of_truth", label: "Source of truth" }, { key: "pricing_linkage", label: "Pricing linkage" }, { key: "proposed_treatment", label: "Proposed treatment", type: "select", options: treatment },
    { key: "future_design", label: "Future design" }, { key: "wave", label: "Wave" }] },
  { type: "logic", label: "Logic", prefix: "LOG", questions: ["P02", "P06", "C05", "X03"], fields: [
    { key: "logic_type", label: "Type", type: "select", options: ["price rule", "product rule", "QCP hook", "discount schedule", "formula", "Apex", "Flow", "validation", "other"] },
    { key: "source_ref", label: "Source object / API / file" }, { key: "active", label: "Active", type: "select", options: ["yes", "no"] },
    { key: "execution", label: "Execution event / order" }, { key: "conditions_actions", label: "Conditions / actions", type: "textarea" }, { key: "dependencies", label: "Dependencies" },
    { key: "business_intent", label: "Business intent", type: "textarea" }, { key: "owner", label: "Owner" }, { key: "usage_evidence", label: "Usage evidence" },
    { key: "target_treatment", label: "Target treatment", type: "select", options: treatment }, { key: "target_design_ref", label: "Target design reference" }, { key: "golden_tests", label: "Golden tests" }] },
  { type: "integration", label: "Integrations", prefix: "INT", questions: ["I01", "I02", "I03", "I04", "I05"], fields: [
    { key: "source_target", label: "Source → target" }, { key: "direction", label: "Direction", type: "select", options: ["inbound", "outbound", "bidirectional"] }, { key: "event", label: "Event" },
    { key: "schema", label: "Schema reference" }, { key: "legacy_references", label: "Legacy references (SBQQ objects / package APIs)" }, { key: "volume", label: "Volume (leave blank if unknown)" },
    { key: "sla", label: "SLA" }, { key: "auth_method", label: "Authentication method name (no secrets)" }, { key: "middleware", label: "Middleware" },
    { key: "external_owner", label: "External owner" }, { key: "redesign", label: "Redesign" }, { key: "readiness", label: "Readiness", type: "select", options: ["not started", "in progress", "ready"] }, { key: "test_contract", label: "Test contract" }] },
  { type: "document", label: "Documents & approvals", prefix: "DOC", questions: ["K01", "K02", "K03", "Q06"], fields: [
    { key: "artifact", label: "Artifact", type: "select", options: ["template", "approval process", "signature flow", "contract"] }, { key: "template_process", label: "Template / process" },
    { key: "entity_language", label: "Entity / language" }, { key: "conditions", label: "Conditions" }, { key: "routing", label: "Routing" }, { key: "generator", label: "Generator" },
    { key: "signature_platform", label: "Signature platform" }, { key: "owner", label: "Owner" }, { key: "target_design", label: "Target design" }, { key: "test", label: "Test" }] },
  { type: "data", label: "Data", prefix: "DAT", questions: ["D01", "D02", "D03", "D05"], fields: [
    { key: "source_object", label: "Source object" }, { key: "volume", label: "Volume" }, { key: "retention", label: "Retention" }, { key: "quality_defects", label: "Measured quality defects" },
    { key: "treatment", label: "Migration treatment", type: "select", options: ["migrate", "reference/archive", "retain legacy", "recreate", "retire", "undecided"] },
    { key: "target_candidate", label: "Target candidate (hypothesis)" }, { key: "parent_dependencies", label: "Parent dependencies" }, { key: "external_keys", label: "External keys" },
    { key: "load_reconcile", label: "Load / reconcile rules" }, { key: "owner", label: "Owner" }] },
  { type: "component", label: "Custom components", prefix: "CMP", questions: ["X01", "X02", "X08"], fields: [
    { key: "component_type", label: "Component type", type: "select", options: ["Apex", "Flow", "Process Builder/Workflow", "Validation rule", "Formula", "LWC/Aura", "Visualforce", "Trigger", "External code", "Package"] },
    { key: "repository", label: "Repository / reference" }, { key: "purpose", label: "Purpose" }, { key: "dependencies", label: "Dependencies" }, { key: "tests", label: "Tests" },
    { key: "disposition", label: "Target disposition", type: "select", options: treatment }, { key: "work_package", label: "Work package" }] },
  { type: "report", label: "Reports & metrics", prefix: "RPT", questions: ["R01", "R02", "R03"], fields: [
    { key: "measure", label: "Business measure" }, { key: "formula", label: "Formula" }, { key: "source_fields", label: "Source fields" }, { key: "audience", label: "Audience" },
    { key: "target_design", label: "Target design" }, { key: "history_reconciliation", label: "Historical reconciliation" }] },
  { type: "scenario", label: "Scenarios", prefix: "SCN", questions: ["P09", "C10", "A09", "T02"], fields: [
    { key: "inputs", label: "Source inputs", type: "textarea" }, { key: "expected_outcome", label: "Expected business outcome" }, { key: "expected_amount", label: "Expected amount", type: "number" },
    { key: "tags", label: "Tags (edge / negative)" }, { key: "source_evidence", label: "Source evidence" }, { key: "target_result", label: "Observed target result", type: "number" },
    { key: "tolerance", label: "Tolerance", type: "number" }, { key: "result", label: "Pass / fail", type: "select", options: ["not run", "pass", "fail"] }, { key: "reviewer", label: "Reviewer" }] },
  ...(["decision", "assumption", "risk", "dependency"] as const).map((t) => ({
    type: t, label: t[0].toUpperCase() + t.slice(1) + "s", prefix: t.slice(0, 3).toUpperCase(), questions: ["T09", "L09"],
    fields: [
      { key: "description", label: "Description", type: "textarea" as const }, { key: "source", label: "Source" }, { key: "impact", label: "Impact" },
      ...(t === "risk" ? [{ key: "probability", label: "Probability", type: "select" as const, options: ["low", "medium", "high"] }] : []),
      { key: "owner", label: "Owner" }, { key: "due_date", label: "Due date" }, { key: "mitigation", label: t === "risk" ? "Mitigation" : "Validation plan" },
      { key: "linked_gap", label: "Linked gap / work package" }],
  })),
];
export const registerDef = (t: string) => REGISTERS.find((r) => r.type === t)!;
