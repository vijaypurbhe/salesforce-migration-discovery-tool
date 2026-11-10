# Revenue Cloud Migration Discovery Studio — full rebuild

Replace the current Axion / commerce demo entirely with the app described in your brief. Keep only the React + Vite + Tailwind + shadcn spine, routing, and Lovable Cloud connection. Built end to end in one pass, following all five increments of the brief (section 16), without pausing between them.

## What gets removed
- All existing pages, features, demo data, agents, commerce dashboards, edge functions and old database tables (clients, agents, workspace records, approvals, login report, etc.).
- Old project memory (GE Vernova branding, commerce narrative, frontend-only login gate) is replaced with rules for the new app.

## What gets built

**1. Foundation**
- Sign-in with email + Google. Workspace admin, engagement lead, architect, customer contributor, customer reviewer, internal viewer roles — enforced per project in the database, plus a separate "can view commercials" permission.
- Portfolio home with Create customer assessment, Resume last assessment, Explore demo.
- Customer workspace with assessment versions.
- Question engine: stable question IDs, declarative branching rules (equals, in, contains, greater_than, any, all, known, confirmed_not_applicable), shared option sets, and the complete section-5 question bank (modules B, L, C, P, Q, K, A, O, U, I, X, D, R, S, T) seeded verbatim.
- Three views over the same answers: Quick start (20 routing questions), Guided discovery, Architect workbench.
- Answer states Known / Unknown / Needs validation / Not applicable (with reason), exact/estimated/band counts, notes, owner, due date, confidence, comments.
- Real backend autosave with Saving / Saved at / Save failed + Retry, resume on any device at the last question, per-answer version conflict detection with merge/choose.
- Evidence file uploads to private storage, revision history on every answer.

**2. Consultant workspace**
- Registers/inventories from section 6 with editable tables, spreadsheet paste and CSV templates.
- Mapping studio (many-to-many: requirement → feature/object/field/logic/scenario), keeping candidate fit, entitlement evidence and architect verification separate.
- Rule-generated delta and fit-gap register with owners, priorities, decisions, scope control and heatmap.

**3. Analysis**
- Capability-gap spider, migration complexity spider and delivery readiness gates using the brief's formulas; insufficient-evidence axes suppressed, accessible data tables beside charts.
- Versioned scoring rubrics, snapshots and side-by-side comparison.

**4. Proposal**
- Migration strategy and rollout comparisons.
- Work packages with editable unit-effort catalog, low/likely/high estimates, visibly incomplete estimates, whole-person staffing, rates hidden without commercial permission.
- Customer-facing and internal exports (PDF/Excel/Markdown) and an optional AI-drafted proposal narrative (clearly marked draft).

**5. Finish**
- Isolated, labeled synthetic demo project covering the QCP, lifecycle-history and SBQQ integration cases from section 14.
- Administration: question templates, option sets, source register (Appendix A seeded), rubric and rate versions.
- Glossary with the Revenue Cloud / Revenue Management naming note.
- White, navy/teal design; desktop-first, mobile card fallbacks, keyboard and screen-reader support.
- Tests for scoring formulas, branching, unknown-vs-zero handling and estimate rules; security scan; short deployment notes in the README.

## Things to know
- This is a very large build; it will take many steps in one go. Some secondary screens may be less polished than the core flow, and I'll list any gaps at the end.
- Customer contributors are outside Tech Mahindra, so the old "@techmahindra.com only" login rule is dropped; access is by project invitation instead. The first sign-in becomes workspace admin.
- No Salesforce connection, no automatic emails, no metadata scanning (as the brief requires).

## Technical details
- New schema (Lovable Cloud): workspaces, profiles, user_roles, customers, assessments, assessment_versions, project_members (role + can_view_commercials), question_templates, questions, option_sets, branch_rules, answers (version column for optimistic locking), answer_revisions, evidence_files, comments, assignments, register_items (typed jsonb), requirements, mappings, findings/deltas, decisions, scoring_versions, scores, snapshots, strategies, work_packages, effort_catalog, rate_cards, exports, source_register, activity_log. All with GRANTs + RLS via security-definer membership helpers; commercial columns in separate tables gated by can_view_commercials.
- Old tables, functions and edge functions dropped in a migration.
- Question bank and option sets stored as typed seed modules and loaded into the database; engine logic as pure TS functions with Vitest coverage.
- Private storage bucket for evidence, path-scoped by project.
- AI narrative via an edge function on the Lovable AI Gateway.
