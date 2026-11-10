export const RUBRIC_VERSION = "rubric-1.0";
export const AXES: { no: number; name: string; short: string; sources: string }[] = [
  { no: 1, name: "Strategy and governance", short: "Strategy", sources: "B, L" },
  { no: 2, name: "Catalog and configuration", short: "Catalog", sources: "C" },
  { no: 3, name: "Pricing and monetization", short: "Pricing", sources: "P (+U03–U04 when relevant)" },
  { no: 4, name: "Quoting and seller experience", short: "Quoting", sources: "Q01–Q05, Q08–Q10" },
  { no: 5, name: "Documents, contracts and approvals", short: "Docs & approvals", sources: "K, Q06–Q07" },
  { no: 6, name: "Assets and commercial lifecycle", short: "Lifecycle", sources: "A" },
  { no: 7, name: "Orders, billing and downstream processes", short: "Orders & billing", sources: "O, U" },
  { no: 8, name: "Integrations and channels", short: "Integrations", sources: "I" },
  { no: 9, name: "Customization and engineering", short: "Customization", sources: "X" },
  { no: 10, name: "Data migration and quality", short: "Data", sources: "D" },
  { no: 11, name: "Reporting and insights", short: "Reporting", sources: "R" },
  { no: 12, name: "Security, operational resilience and adoption", short: "Security & adoption", sources: "S, T" },
];
export const CAPABILITY_ANCHORS = [
  "0 Absent", "1 Ad hoc / manual", "2 Partially supported with substantial workarounds",
  "3 Repeatable but limited coverage", "4 Controlled, most required scenarios supported",
  "5 Complete for the documented requirement and agreed operating controls",
];
export const COMPLEXITY_ANCHORS = [
  "1 Bounded, documented standard behaviour; few dependencies; proven approach",
  "2 Limited variants; known transformations; minor dependencies",
  "3 Multiple variants; moderate redesign; several dependencies; some proof pending",
  "4 Material custom logic; deep dependencies; large remediation or lifecycle continuity",
  "5 Extensive redesign / cross-system coupling; unresolved critical behaviour",
];
export const PRIORITY_ANCHORS = ["1 Negligible / noncritical", "2 Minor", "3 Moderate", "4 Major", "5 Severe / blocking"];
