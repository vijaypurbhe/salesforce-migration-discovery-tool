
-- Comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  target_type text NOT NULL, target_id text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer','internal')),
  author uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated; GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments read" ON public.comments FOR SELECT TO authenticated USING (public.is_internal_member(project_id) OR (public.is_project_member(project_id) AND visibility='customer'));
CREATE POLICY "comments insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (author = auth.uid() AND public.is_project_member(project_id) AND (visibility='customer' OR public.is_internal_member(project_id)));
CREATE POLICY "comments delete own" ON public.comments FOR DELETE TO authenticated USING (author = auth.uid());

-- Assignments / follow-ups
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  question_id text,
  kind text NOT NULL CHECK (kind IN ('sme','workshop','ask_later','evidence','validation')),
  assignee_label text NOT NULL DEFAULT '',
  assignee_id uuid,
  note text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','cancelled')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated; GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assign read" ON public.assignments FOR SELECT TO authenticated USING (public.is_project_member(project_id));
CREATE POLICY "assign insert" ON public.assignments FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_project_member(project_id) AND public.project_role_of(project_id) NOT IN ('customer_reviewer','internal_viewer'));
CREATE POLICY "assign update" ON public.assignments FOR UPDATE TO authenticated USING (public.can_edit_internal(project_id) OR created_by = auth.uid() OR assignee_id = auth.uid()) WITH CHECK (public.is_project_member(project_id));
CREATE POLICY "assign delete" ON public.assignments FOR DELETE TO authenticated USING (public.can_edit_internal(project_id) OR created_by = auth.uid());

-- Evidence files
CREATE TABLE public.evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  question_id text,
  target_type text, target_id text,
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  checksum text NOT NULL,
  classification text NOT NULL DEFAULT 'customer' CHECK (classification IN ('customer','internal','confidential')),
  version integer NOT NULL DEFAULT 1,
  replaces_id uuid REFERENCES public.evidence_files(id),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','validated','rejected','superseded')),
  description text NOT NULL DEFAULT '',
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE ON public.evidence_files TO authenticated; GRANT ALL ON public.evidence_files TO service_role;
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence read" ON public.evidence_files FOR SELECT TO authenticated USING (public.is_internal_member(project_id) OR (public.is_project_member(project_id) AND classification <> 'internal'));
CREATE POLICY "evidence insert" ON public.evidence_files FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND public.is_project_member(project_id) AND public.project_role_of(project_id) NOT IN ('customer_reviewer','internal_viewer') AND (classification <> 'internal' OR public.is_internal_member(project_id)) AND storage_path LIKE project_id::text || '/%');
CREATE POLICY "evidence update" ON public.evidence_files FOR UPDATE TO authenticated USING (public.can_edit_internal(project_id)) WITH CHECK (public.can_edit_internal(project_id));

-- Registers (catalog, logic, integration, document, data, component, report, scenario, decision, assumption, risk, dependency)
CREATE TABLE public.register_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  register_type text NOT NULL CHECK (register_type IN ('catalog','logic','integration','document','data','component','report','scenario','decision','assumption','risk','dependency')),
  code text NOT NULL,
  title text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','submitted','reviewed','disputed')),
  linked_question_ids text[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer','internal')),
  archived boolean NOT NULL DEFAULT false,
  row_version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, register_type, code),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.register_items TO authenticated; GRANT ALL ON public.register_items TO service_role;
ALTER TABLE public.register_items ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_write_register(_project uuid, _type text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_edit_internal(_project) OR EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project AND user_id = auth.uid() AND role = 'customer_contributor' AND _type = ANY(assigned_registers)) $$;
CREATE POLICY "reg read" ON public.register_items FOR SELECT TO authenticated USING (public.is_internal_member(project_id) OR (public.is_project_member(project_id) AND visibility='customer'));
CREATE POLICY "reg insert" ON public.register_items FOR INSERT TO authenticated WITH CHECK (public.can_write_register(project_id, register_type) AND (visibility='customer' OR public.can_edit_internal(project_id)));
CREATE POLICY "reg update" ON public.register_items FOR UPDATE TO authenticated USING (public.can_write_register(project_id, register_type) AND (visibility='customer' OR public.can_edit_internal(project_id))) WITH CHECK (public.can_write_register(project_id, register_type) AND (visibility='customer' OR public.can_edit_internal(project_id)));
CREATE POLICY "reg delete" ON public.register_items FOR DELETE TO authenticated USING (public.can_edit_internal(project_id));

-- Requirements
CREATE TABLE public.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  requirement_type text NOT NULL DEFAULT 'Functional',
  axis smallint NOT NULL CHECK (axis BETWEEN 1 AND 12),
  priority text NOT NULL DEFAULT 'must' CHECK (priority IN ('must','should','could','out')),
  applicability text NOT NULL DEFAULT 'applicable' CHECK (applicability IN ('applicable','unresolved','not_applicable')),
  critical boolean NOT NULL DEFAULT false,
  current_behavior text NOT NULL DEFAULT '',
  future_behavior text NOT NULL DEFAULT '',
  acceptance_criteria text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'In initial migration',
  wave text NOT NULL DEFAULT '',
  current_score smallint CHECK (current_score BETWEEN 0 AND 5),
  target_score smallint CHECK (target_score BETWEEN 0 AND 5),
  proposed_coverage smallint CHECK (proposed_coverage BETWEEN 0 AND 5),
  score_reviewed boolean NOT NULL DEFAULT false,
  score_rationale text NOT NULL DEFAULT '',
  reviewed_by uuid,
  linked_question_ids text[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer','internal')),
  archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, code),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);

CREATE TABLE public.mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  code text NOT NULL,
  domain text NOT NULL DEFAULT '',
  legacy_area text NOT NULL,
  candidate_target text NOT NULL DEFAULT '',
  discovery_proof text NOT NULL DEFAULT '',
  target_api_names text NOT NULL DEFAULT '',
  api_names_validated boolean NOT NULL DEFAULT false,
  disposition text NOT NULL DEFAULT 'unresolved',
  fit_status text NOT NULL DEFAULT 'validation_pending' CHECK (fit_status IN ('candidate_fit','verified_native_fit','configuration_required','extension_required','third_party_dependency','known_unmet','validation_pending','out_of_scope')),
  entitlement_status text NOT NULL DEFAULT 'unconfirmed' CHECK (entitlement_status IN ('unconfirmed','purchased','quoted','under_evaluation','unavailable')),
  release_availability text NOT NULL DEFAULT '',
  validation_date date,
  poc_result text NOT NULL DEFAULT '',
  architect_rationale text NOT NULL DEFAULT '',
  verified_by uuid,
  verified_at timestamptz,
  gap_category text NOT NULL DEFAULT '',
  business_impact text NOT NULL DEFAULT '',
  requirement_ids uuid[] NOT NULL DEFAULT '{}',
  artifact_ids uuid[] NOT NULL DEFAULT '{}',
  scenario_ids uuid[] NOT NULL DEFAULT '{}',
  linked_question_ids text[] NOT NULL DEFAULT '{}',
  work_package_id uuid,
  is_seed_prompt boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer','internal')),
  archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, code),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
-- verified fit requires a named verifier and validation date
CREATE OR REPLACE FUNCTION public.validate_mapping() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.fit_status = 'verified_native_fit' AND (NEW.verified_by IS NULL OR NEW.validation_date IS NULL OR NEW.entitlement_status NOT IN ('purchased')) THEN
    RAISE EXCEPTION 'Verified native fit requires an architect verifier, validation date and purchased entitlement';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_mapping BEFORE INSERT OR UPDATE ON public.mappings FOR EACH ROW EXECUTE FUNCTION public.validate_mapping();

CREATE TABLE public.work_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  workstream text NOT NULL,
  wave text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT true,
  conditional boolean NOT NULL DEFAULT false,
  deliverables text NOT NULL DEFAULT '',
  acceptance_criteria text NOT NULL DEFAULT '',
  dependencies text NOT NULL DEFAULT '',
  customer_responsibilities text NOT NULL DEFAULT '',
  assumptions text NOT NULL DEFAULT '',
  role_mix jsonb NOT NULL DEFAULT '{}'::jsonb,
  requirement_ids uuid[] NOT NULL DEFAULT '{}',
  finding_ids uuid[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer','internal')),
  archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, code),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);

CREATE TABLE public.findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  code text NOT NULL,
  rule_id text NOT NULL,
  finding_key text NOT NULL DEFAULT '',
  rule_version text NOT NULL DEFAULT 'rules-1.0',
  analysis_run_id uuid,
  title text NOT NULL,
  domain text NOT NULL DEFAULT '',
  kinds text[] NOT NULL DEFAULT '{delta}',
  categories text[] NOT NULL DEFAULT '{}',
  current_state text NOT NULL DEFAULT '',
  required_state text NOT NULL DEFAULT '',
  delta_type text NOT NULL DEFAULT '',
  fit_status text NOT NULL DEFAULT 'validation_pending',
  proposed_treatment text NOT NULL DEFAULT '',
  confidence text NOT NULL DEFAULT 'self_reported',
  impact smallint CHECK (impact BETWEEN 1 AND 5),
  urgency smallint CHECK (urgency BETWEEN 1 AND 5),
  delivery_risk smallint CHECK (delivery_risk BETWEEN 1 AND 5),
  dependency_criticality smallint CHECK (dependency_criticality BETWEEN 1 AND 5),
  is_blocker boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','accepted','closed','reopened')),
  decision text NOT NULL DEFAULT '',
  decision_rationale text NOT NULL DEFAULT '',
  needs_review boolean NOT NULL DEFAULT false,
  owner_label text NOT NULL DEFAULT '',
  due_date date,
  validation_task text NOT NULL DEFAULT '',
  acceptance_criterion text NOT NULL DEFAULT '',
  evidence_note text NOT NULL DEFAULT '',
  internal_wording text NOT NULL DEFAULT '',
  work_package_id uuid,
  linked_question_ids text[] NOT NULL DEFAULT '{}',
  source_answer_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer','internal')),
  manual boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, rule_id, finding_key),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);

CREATE TABLE public.complexity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  axis smallint NOT NULL CHECK (axis BETWEEN 1 AND 12),
  score smallint CHECK (score BETWEEN 1 AND 5),
  rationale text NOT NULL DEFAULT '',
  uncertainty boolean NOT NULL DEFAULT false,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, axis),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
CREATE TABLE public.readiness_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  gate_no smallint NOT NULL CHECK (gate_no BETWEEN 1 AND 10),
  state smallint NOT NULL DEFAULT 0 CHECK (state BETWEEN 0 AND 3),
  assessed boolean NOT NULL DEFAULT false,
  applicable boolean NOT NULL DEFAULT true,
  na_reason text NOT NULL DEFAULT '',
  na_reviewed boolean NOT NULL DEFAULT false,
  evidence_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, gate_no),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
CREATE TABLE public.strategy_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  name text NOT NULL,
  design_strategy text NOT NULL,
  deployment_model text NOT NULL DEFAULT 'undecided',
  rollout_pattern text NOT NULL DEFAULT 'undecided',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  criteria_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_recommended boolean NOT NULL DEFAULT false,
  recommendation_rationale text NOT NULL DEFAULT '',
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
CREATE TABLE public.analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  rule_version text NOT NULL,
  input_hash text NOT NULL,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  flagged_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);

-- Generic policies for internal-edited, customer-visible tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['requirements','mappings','work_packages','findings'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s read" ON public.%I FOR SELECT TO authenticated USING (public.is_internal_member(project_id) OR (public.is_project_member(project_id) AND visibility = ''customer''))', t, t);
    EXECUTE format('CREATE POLICY "%s insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_edit_internal(project_id))', t, t);
    EXECUTE format('CREATE POLICY "%s update" ON public.%I FOR UPDATE TO authenticated USING (public.can_edit_internal(project_id)) WITH CHECK (public.can_edit_internal(project_id))', t, t);
    EXECUTE format('CREATE POLICY "%s delete" ON public.%I FOR DELETE TO authenticated USING (public.can_edit_internal(project_id))', t, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['complexity_scores','readiness_gates','strategy_scenarios','analysis_runs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s read" ON public.%I FOR SELECT TO authenticated USING (public.is_project_member(project_id))', t, t);
    EXECUTE format('CREATE POLICY "%s insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_edit_internal(project_id))', t, t);
    EXECUTE format('CREATE POLICY "%s update" ON public.%I FOR UPDATE TO authenticated USING (public.can_edit_internal(project_id)) WITH CHECK (public.can_edit_internal(project_id))', t, t);
    EXECUTE format('CREATE POLICY "%s delete" ON public.%I FOR DELETE TO authenticated USING (public.can_edit_internal(project_id))', t, t);
  END LOOP;
END $$;

-- Commercial / internal-only tables
CREATE TABLE public.estimate_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  work_package_id uuid NOT NULL REFERENCES public.work_packages(id) ON DELETE CASCADE,
  unit_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  quantity_mode text NOT NULL DEFAULT 'exact' CHECK (quantity_mode IN ('exact','band')),
  qty_low numeric CHECK (qty_low >= 0),
  qty_likely numeric CHECK (qty_likely >= 0),
  qty_high numeric CHECK (qty_high >= 0),
  hours_low numeric CHECK (hours_low >= 0),
  hours_likely numeric CHECK (hours_likely >= 0),
  hours_high numeric CHECK (hours_high >= 0),
  allocation_pct numeric NOT NULL DEFAULT 100 CHECK (allocation_pct > 0 AND allocation_pct <= 100),
  is_fixed_task boolean NOT NULL DEFAULT false,
  basis text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (qty_low IS NULL OR qty_likely IS NULL OR qty_low <= qty_likely),
  CHECK (qty_likely IS NULL OR qty_high IS NULL OR qty_likely <= qty_high),
  CHECK (hours_low IS NULL OR hours_likely IS NULL OR hours_low <= hours_likely),
  CHECK (hours_likely IS NULL OR hours_high IS NULL OR hours_likely <= hours_high),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
CREATE TABLE public.commercial_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL UNIQUE, project_id uuid NOT NULL,
  currency text CHECK (currency ~ '^[A-Z]{3}$'),
  contingency_model text NOT NULL DEFAULT 'none' CHECK (contingency_model IN ('none','percentage','risk_hours')),
  contingency_pct numeric CHECK (contingency_pct >= 0 AND contingency_pct <= 100),
  risk_hours_low numeric CHECK (risk_hours_low >= 0), risk_hours_likely numeric CHECK (risk_hours_likely >= 0), risk_hours_high numeric CHECK (risk_hours_high >= 0),
  rom_selected boolean NOT NULL DEFAULT false,
  rom_basis text NOT NULL DEFAULT '',
  role_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  role_split jsonb NOT NULL DEFAULT '{}'::jsonb,
  hours_per_person_week numeric CHECK (hours_per_person_week > 0 AND hours_per_person_week <= 80),
  target_weeks numeric CHECK (target_weeks > 0),
  customer_sme_capacity text NOT NULL DEFAULT '',
  expenses_note text NOT NULL DEFAULT '',
  margin_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
CREATE TABLE public.internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  target_type text NOT NULL, target_id text NOT NULL,
  body text NOT NULL,
  author uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
CREATE TABLE public.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('initial_discovery','architect_review','customer_validated','proposal_baseline','updated_scope','other')),
  name text NOT NULL,
  template_version text NOT NULL,
  rubric_version text NOT NULL,
  rule_version text NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_lines, public.commercial_inputs, public.internal_notes TO authenticated;
GRANT SELECT, INSERT ON public.snapshots TO authenticated;
GRANT ALL ON public.estimate_lines, public.commercial_inputs, public.internal_notes, public.snapshots TO service_role;
ALTER TABLE public.estimate_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "est read" ON public.estimate_lines FOR SELECT TO authenticated USING (public.can_view_commercials(project_id));
CREATE POLICY "est write" ON public.estimate_lines FOR ALL TO authenticated USING (public.can_view_commercials(project_id) AND public.can_edit_internal(project_id)) WITH CHECK (public.can_view_commercials(project_id) AND public.can_edit_internal(project_id));
CREATE POLICY "com read" ON public.commercial_inputs FOR SELECT TO authenticated USING (public.can_view_commercials(project_id));
CREATE POLICY "com write" ON public.commercial_inputs FOR ALL TO authenticated USING (public.can_view_commercials(project_id) AND public.can_edit_internal(project_id)) WITH CHECK (public.can_view_commercials(project_id) AND public.can_edit_internal(project_id));
CREATE POLICY "notes read" ON public.internal_notes FOR SELECT TO authenticated USING (public.is_internal_member(project_id));
CREATE POLICY "notes insert" ON public.internal_notes FOR INSERT TO authenticated WITH CHECK (author = auth.uid() AND public.is_internal_member(project_id));
CREATE POLICY "notes delete" ON public.internal_notes FOR DELETE TO authenticated USING (author = auth.uid());
CREATE POLICY "snap read" ON public.snapshots FOR SELECT TO authenticated USING (public.is_internal_member(project_id));
CREATE POLICY "snap insert" ON public.snapshots FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.can_edit_internal(project_id));

-- Workspace-level configuration
CREATE TABLE public.effort_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT 'catalog-1.0',
  unit_type text NOT NULL,
  label text NOT NULL,
  hours_low numeric CHECK (hours_low >= 0),
  hours_likely numeric CHECK (hours_likely >= 0),
  hours_high numeric CHECK (hours_high >= 0),
  benchmark_ref text NOT NULL DEFAULT '',
  is_demo boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version, unit_type, is_demo),
  CHECK (hours_low IS NULL OR hours_likely IS NULL OR hours_low <= hours_likely),
  CHECK (hours_likely IS NULL OR hours_high IS NULL OR hours_likely <= hours_high)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.effort_catalog TO authenticated; GRANT ALL ON public.effort_catalog TO service_role;
ALTER TABLE public.effort_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog read internal" ON public.effort_catalog FOR SELECT TO authenticated USING (public.has_app_role(auth.uid(),'internal_staff'));
CREATE POLICY "catalog write admin" ON public.effort_catalog FOR ALL TO authenticated USING (public.has_app_role(auth.uid(),'workspace_admin')) WITH CHECK (public.has_app_role(auth.uid(),'workspace_admin'));

CREATE TABLE public.source_references (
  id text PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  provider text NOT NULL,
  checked_date date NOT NULL,
  guidance text NOT NULL DEFAULT '',
  capability_tags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_references TO authenticated; GRANT ALL ON public.source_references TO service_role;
ALTER TABLE public.source_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources read" ON public.source_references FOR SELECT TO authenticated USING (true);
CREATE POLICY "sources write admin" ON public.source_references FOR ALL TO authenticated USING (public.has_app_role(auth.uid(),'workspace_admin')) WITH CHECK (public.has_app_role(auth.uid(),'workspace_admin'));

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated; GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings write admin" ON public.app_settings FOR ALL TO authenticated USING (public.has_app_role(auth.uid(),'workspace_admin')) WITH CHECK (public.has_app_role(auth.uid(),'workspace_admin'));

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_profiles','customers','projects','assessments','assignments','register_items','requirements','work_packages','findings','strategy_scenarios','estimate_lines','commercial_inputs'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- Demo project join and reset
CREATE OR REPLACE FUNCTION public.join_demo_project()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_customer uuid; v_project uuid; v_assessment uuid; v_fresh boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO v_project FROM public.projects WHERE is_demo LIMIT 1;
  IF v_project IS NULL THEN
    INSERT INTO public.customers(name, industry, region, description, is_demo, created_by)
    VALUES ('Northstar Equipment (DEMO)', 'Industrial equipment (fictional)', 'Global (fictional)', 'Synthetic demonstration customer. No real customer facts.', true, auth.uid())
    RETURNING id INTO v_customer;
    INSERT INTO public.projects(customer_id, name, is_demo, created_by)
    VALUES (v_customer, 'Northstar Equipment Demo', true, auth.uid()) RETURNING id INTO v_project;
    v_fresh := true;
  END IF;
  INSERT INTO public.project_members(project_id, user_id, role, can_view_commercials, added_by)
  VALUES (v_project, auth.uid(), 'engagement_lead', true, auth.uid()) ON CONFLICT (project_id, user_id) DO NOTHING;
  SELECT id INTO v_assessment FROM public.assessments WHERE project_id = v_project ORDER BY created_at LIMIT 1;
  IF v_assessment IS NULL THEN
    INSERT INTO public.assessments(project_id, name, target_product_name, entitlement_notes, created_by)
    VALUES (v_project, 'CPQ to Revenue Cloud discovery (DEMO)', 'Revenue Cloud', 'DEMO: target licensing under evaluation', auth.uid()) RETURNING id INTO v_assessment;
    v_fresh := true;
  END IF;
  RETURN jsonb_build_object('project_id', v_project, 'assessment_id', v_assessment, 'needs_seed', v_fresh OR NOT EXISTS (SELECT 1 FROM public.answers WHERE assessment_id = v_assessment));
END; $$;
GRANT EXECUTE ON FUNCTION public.join_demo_project() TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_demo_project(p_project uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project AND is_demo) THEN RAISE EXCEPTION 'Reset is only available for demo projects'; END IF;
  IF NOT public.is_project_lead(p_project) THEN RAISE EXCEPTION 'not permitted'; END IF;
  DELETE FROM public.estimate_lines WHERE project_id = p_project;
  DELETE FROM public.commercial_inputs WHERE project_id = p_project;
  DELETE FROM public.findings WHERE project_id = p_project;
  DELETE FROM public.mappings WHERE project_id = p_project;
  DELETE FROM public.work_packages WHERE project_id = p_project;
  DELETE FROM public.requirements WHERE project_id = p_project;
  DELETE FROM public.register_items WHERE project_id = p_project;
  DELETE FROM public.complexity_scores WHERE project_id = p_project;
  DELETE FROM public.readiness_gates WHERE project_id = p_project;
  DELETE FROM public.strategy_scenarios WHERE project_id = p_project;
  DELETE FROM public.assignments WHERE project_id = p_project;
  DELETE FROM public.comments WHERE project_id = p_project;
  DELETE FROM public.internal_notes WHERE project_id = p_project;
  DELETE FROM public.analysis_runs WHERE project_id = p_project;
  DELETE FROM public.snapshots WHERE project_id = p_project;
  DELETE FROM public.answers WHERE project_id = p_project;
  INSERT INTO public.audit_events(project_id, actor, action, object_type, object_id, summary)
  VALUES (p_project, auth.uid(), 'demo.reset', 'project', p_project::text, 'Demo data reset');
END; $$;
GRANT EXECUTE ON FUNCTION public.reset_demo_project(uuid) TO authenticated;

-- Storage policies for private evidence bucket
CREATE POLICY "evidence objects read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'evidence' AND EXISTS (SELECT 1 FROM public.evidence_files ef WHERE ef.storage_path = storage.objects.name
    AND (public.is_internal_member(ef.project_id) OR (public.is_project_member(ef.project_id) AND ef.classification <> 'internal'))));
CREATE POLICY "evidence objects insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'evidence' AND public.is_project_member(((storage.foldername(name))[1])::uuid)
  AND public.project_role_of(((storage.foldername(name))[1])::uuid) NOT IN ('customer_reviewer','internal_viewer'));
