
CREATE TYPE public.studio_app_role AS ENUM ('workspace_admin','internal_staff');
CREATE TYPE public.project_role AS ENUM ('engagement_lead','solution_architect','customer_contributor','customer_reviewer','internal_viewer');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles & app roles
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  organisation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.studio_app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.app_user_roles TO authenticated;
GRANT ALL ON public.app_user_roles TO service_role;
ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_app_role(_user_id uuid, _role public.studio_app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Customers / projects / members
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT ('CUS-' || upper(substr(md5(random()::text),1,6))),
  name text NOT NULL,
  industry text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  is_demo boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  code text NOT NULL DEFAULT ('PRJ-' || upper(substr(md5(random()::text),1,6))),
  name text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  ai_processing_enabled boolean NOT NULL DEFAULT false,
  retention_note text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.project_role NOT NULL,
  can_view_commercials boolean NOT NULL DEFAULT false,
  assigned_modules text[] NOT NULL DEFAULT '{}',
  assigned_registers text[] NOT NULL DEFAULT '{}',
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- Helper functions
CREATE OR REPLACE FUNCTION public.project_role_of(_project uuid) RETURNS public.project_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.project_members WHERE project_id = _project AND user_id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.is_project_member(_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project AND user_id = auth.uid()) $$;
CREATE OR REPLACE FUNCTION public.is_internal_member(_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project AND user_id = auth.uid()
    AND role IN ('engagement_lead','solution_architect','internal_viewer')) $$;
CREATE OR REPLACE FUNCTION public.can_edit_internal(_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project AND user_id = auth.uid()
    AND role IN ('engagement_lead','solution_architect')) $$;
CREATE OR REPLACE FUNCTION public.is_project_lead(_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project AND user_id = auth.uid()
    AND role = 'engagement_lead') $$;
CREATE OR REPLACE FUNCTION public.can_view_commercials(_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project AND user_id = auth.uid()
    AND can_view_commercials AND role IN ('engagement_lead','solution_architect','internal_viewer')) $$;
CREATE OR REPLACE FUNCTION public.can_access_customer(_customer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = _customer AND c.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects p JOIN public.project_members m ON m.project_id = p.id
                 WHERE p.customer_id = _customer AND m.user_id = auth.uid()) $$;
CREATE OR REPLACE FUNCTION public.shares_project_with(_other uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members a JOIN public.project_members b ON a.project_id = b.project_id
                 WHERE a.user_id = auth.uid() AND b.user_id = _other) $$;

GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers read" ON public.customers FOR SELECT TO authenticated USING (public.can_access_customer(id));
CREATE POLICY "customers create by internal staff" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_app_role(auth.uid(),'internal_staff') AND created_by = auth.uid() AND is_demo = false);
CREATE POLICY "customers update" ON public.customers FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.customer_id = id AND public.is_project_lead(p.id)))
  WITH CHECK (is_demo = (SELECT c.is_demo FROM public.customers c WHERE c.id = customers.id));

GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects read" ON public.projects FOR SELECT TO authenticated USING (public.is_project_member(id) OR created_by = auth.uid());
CREATE POLICY "projects create" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_app_role(auth.uid(),'internal_staff') AND created_by = auth.uid() AND is_demo = false
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.created_by = auth.uid()));
CREATE POLICY "projects update by lead" ON public.projects FOR UPDATE TO authenticated
  USING (public.is_project_lead(id)) WITH CHECK (public.is_project_lead(id));

GRANT SELECT ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read" ON public.project_members FOR SELECT TO authenticated USING (public.is_project_member(project_id));

CREATE POLICY "profiles read" ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.shares_project_with(id) OR public.has_app_role(auth.uid(),'workspace_admin'));
CREATE POLICY "profiles update own" ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "roles read" ON public.app_user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_app_role(auth.uid(),'workspace_admin'));

-- creator becomes engagement lead
CREATE OR REPLACE FUNCTION public.on_project_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.is_demo THEN
    INSERT INTO public.project_members(project_id, user_id, role, can_view_commercials, added_by)
    VALUES (NEW.id, NEW.created_by, 'engagement_lead', true, NEW.created_by) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_project_created AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.on_project_created();

-- new auth user
CREATE OR REPLACE FUNCTION public.handle_studio_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles(id, email, display_name)
  VALUES (NEW.id, coalesce(NEW.email,''), coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(coalesce(NEW.email,''),'@',1)))
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.app_user_roles WHERE role = 'workspace_admin') THEN
    INSERT INTO public.app_user_roles(user_id, role) VALUES (NEW.id,'workspace_admin'),(NEW.id,'internal_staff') ON CONFLICT DO NOTHING;
  ELSIF lower(coalesce(NEW.email,'')) LIKE '%@techmahindra.com' THEN
    INSERT INTO public.app_user_roles(user_id, role) VALUES (NEW.id,'internal_staff') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created_studio AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_studio_new_user();

-- backfill existing users
INSERT INTO public.user_profiles(id, email, display_name)
SELECT id, coalesce(email,''), split_part(coalesce(email,''),'@',1) FROM auth.users ON CONFLICT DO NOTHING;
INSERT INTO public.app_user_roles(user_id, role)
SELECT id, 'internal_staff'::public.studio_app_role FROM auth.users WHERE lower(email) LIKE '%@techmahindra.com' ON CONFLICT DO NOTHING;
INSERT INTO public.app_user_roles(user_id, role)
SELECT id, 'workspace_admin'::public.studio_app_role FROM auth.users WHERE lower(email) = 'vijay.purbhe@techmahindra.com' ON CONFLICT DO NOTHING;

-- Assessments
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text NOT NULL DEFAULT ('ASM-' || upper(substr(md5(random()::text),1,6))),
  name text NOT NULL,
  stage text NOT NULL DEFAULT 'discovery' CHECK (stage IN ('discovery','architect_review','customer_validation','proposal','baselined','archived')),
  template_version text NOT NULL DEFAULT 'cpq-rc-1.0',
  rubric_version text NOT NULL DEFAULT 'rubric-1.0',
  rule_version text NOT NULL DEFAULT 'rules-1.0',
  target_product_name text NOT NULL DEFAULT 'Revenue Cloud',
  target_release text NOT NULL DEFAULT '',
  entitlement_notes text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT 'en-GB',
  timezone text NOT NULL DEFAULT 'UTC',
  decision_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  bulk_na jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);
GRANT SELECT, INSERT, UPDATE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments read" ON public.assessments FOR SELECT TO authenticated USING (public.is_project_member(project_id));
CREATE POLICY "assessments create" ON public.assessments FOR INSERT TO authenticated WITH CHECK (public.can_edit_internal(project_id));
CREATE POLICY "assessments update" ON public.assessments FOR UPDATE TO authenticated USING (public.can_edit_internal(project_id)) WITH CHECK (public.can_edit_internal(project_id));

CREATE TABLE public.user_assessment_state (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  last_question_id text,
  last_view text NOT NULL DEFAULT 'quick',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, assessment_id)
);
GRANT SELECT, INSERT, UPDATE ON public.user_assessment_state TO authenticated;
GRANT ALL ON public.user_assessment_state TO service_role;
ALTER TABLE public.user_assessment_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own state" ON public.user_assessment_state FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.is_project_member(a.project_id)));

-- Answers
CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  project_id uuid NOT NULL,
  question_id text NOT NULL,
  instance_key text NOT NULL DEFAULT '',
  state text NOT NULL CHECK (state IN ('known','unknown','needs_validation','not_applicable')),
  value jsonb,
  notes text,
  na_reason text,
  confidence text NOT NULL DEFAULT 'self_reported' CHECK (confidence IN ('self_reported','documented','tested')),
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','submitted','reviewed','disputed')),
  owner_label text,
  due_date date,
  needs_revalidation boolean NOT NULL DEFAULT false,
  row_version integer NOT NULL DEFAULT 1,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_id, instance_key),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
CREATE TABLE public.answer_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL,
  project_id uuid NOT NULL,
  question_id text NOT NULL,
  row_version integer NOT NULL,
  state text NOT NULL,
  value jsonb,
  notes text,
  na_reason text,
  confidence text NOT NULL,
  review_status text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
CREATE INDEX ON public.answer_revisions(answer_id, row_version);
GRANT SELECT ON public.answers, public.answer_revisions TO authenticated;
GRANT ALL ON public.answers, public.answer_revisions TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers read" ON public.answers FOR SELECT TO authenticated
  USING (public.is_internal_member(project_id) OR (public.is_project_member(project_id) AND question_id NOT IN ('B07','T08')));
CREATE POLICY "revisions read" ON public.answer_revisions FOR SELECT TO authenticated
  USING (public.is_internal_member(project_id) OR (public.is_project_member(project_id) AND question_id NOT IN ('B07','T08')));

-- Audit
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assessment_id uuid,
  actor uuid,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read internal" ON public.audit_events FOR SELECT TO authenticated USING (public.is_internal_member(project_id));
CREATE POLICY "audit insert member" ON public.audit_events FOR INSERT TO authenticated WITH CHECK (public.is_project_member(project_id) AND actor = auth.uid());

-- Save answer RPC (transactional, optimistic concurrency)
CREATE OR REPLACE FUNCTION public.save_answer(
  p_assessment uuid, p_question text, p_instance text, p_state text, p_value jsonb,
  p_notes text, p_na_reason text, p_confidence text, p_expected_version integer,
  p_owner text DEFAULT NULL, p_due date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project uuid; v_role public.project_role; v_mods text[]; v_cur public.answers; v_new public.answers;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT project_id INTO v_project FROM public.assessments WHERE id = p_assessment;
  IF v_project IS NULL THEN RAISE EXCEPTION 'assessment not found'; END IF;
  SELECT role, assigned_modules INTO v_role, v_mods FROM public.project_members WHERE project_id = v_project AND user_id = auth.uid();
  IF v_role IS NULL THEN RAISE EXCEPTION 'not a project member'; END IF;
  IF v_role IN ('customer_reviewer','internal_viewer') THEN RAISE EXCEPTION 'read-only role'; END IF;
  IF v_role = 'customer_contributor' THEN
    IF p_question IN ('B07','T08') THEN RAISE EXCEPTION 'internal question'; END IF;
    IF NOT (left(p_question,1) = ANY(v_mods) OR p_question = ANY(v_mods)) THEN RAISE EXCEPTION 'question not assigned to you'; END IF;
  END IF;
  IF p_question !~ '^[A-Z][0-9]{2}$' THEN RAISE EXCEPTION 'invalid question id'; END IF;
  IF p_state NOT IN ('known','unknown','needs_validation','not_applicable') THEN RAISE EXCEPTION 'invalid state'; END IF;
  IF p_state = 'not_applicable' AND coalesce(btrim(p_na_reason),'') = '' THEN RAISE EXCEPTION 'Not applicable requires a reason'; END IF;
  IF p_state = 'known' AND (p_value IS NULL OR p_value = 'null'::jsonb) THEN RAISE EXCEPTION 'Known answer requires a value'; END IF;
  IF coalesce(p_confidence,'self_reported') NOT IN ('self_reported','documented','tested') THEN RAISE EXCEPTION 'invalid confidence'; END IF;

  SELECT * INTO v_cur FROM public.answers WHERE assessment_id = p_assessment AND question_id = p_question AND instance_key = coalesce(p_instance,'') FOR UPDATE;
  IF FOUND THEN
    IF p_expected_version IS DISTINCT FROM v_cur.row_version THEN
      RETURN jsonb_build_object('status','conflict','answer', to_jsonb(v_cur));
    END IF;
    UPDATE public.answers SET state = p_state, value = p_value, notes = p_notes,
      na_reason = CASE WHEN p_state='not_applicable' THEN p_na_reason ELSE NULL END,
      confidence = coalesce(p_confidence,'self_reported'),
      review_status = CASE WHEN review_status = 'reviewed' THEN 'submitted' ELSE review_status END,
      owner_label = p_owner, due_date = p_due, needs_revalidation = false,
      row_version = row_version + 1, updated_by = auth.uid(), updated_at = now()
    WHERE id = v_cur.id RETURNING * INTO v_new;
  ELSE
    IF coalesce(p_expected_version,0) <> 0 THEN
      RETURN jsonb_build_object('status','conflict','answer', NULL);
    END IF;
    INSERT INTO public.answers(assessment_id, project_id, question_id, instance_key, state, value, notes, na_reason, confidence, owner_label, due_date, updated_by)
    VALUES (p_assessment, v_project, p_question, coalesce(p_instance,''), p_state, p_value, p_notes,
      CASE WHEN p_state='not_applicable' THEN p_na_reason ELSE NULL END, coalesce(p_confidence,'self_reported'), p_owner, p_due, auth.uid())
    RETURNING * INTO v_new;
  END IF;
  INSERT INTO public.answer_revisions(answer_id, assessment_id, project_id, question_id, row_version, state, value, notes, na_reason, confidence, review_status, changed_by)
  VALUES (v_new.id, v_new.assessment_id, v_new.project_id, v_new.question_id, v_new.row_version, v_new.state, v_new.value, v_new.notes, v_new.na_reason, v_new.confidence, v_new.review_status, auth.uid());
  INSERT INTO public.audit_events(project_id, assessment_id, actor, action, object_type, object_id, summary)
  VALUES (v_project, p_assessment, auth.uid(), 'answer.saved', 'answer', p_question, p_question || ' → ' || p_state || ' (v' || v_new.row_version || ')');
  RETURN jsonb_build_object('status','saved','answer', to_jsonb(v_new));
END; $$;
GRANT EXECUTE ON FUNCTION public.save_answer(uuid,text,text,text,jsonb,text,text,text,integer,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_answer_review(p_answer uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.answers;
BEGIN
  SELECT * INTO v FROM public.answers WHERE id = p_answer;
  IF v.id IS NULL OR NOT public.can_edit_internal(v.project_id) THEN RAISE EXCEPTION 'not permitted'; END IF;
  IF p_status NOT IN ('draft','submitted','reviewed','disputed') THEN RAISE EXCEPTION 'invalid status'; END IF;
  UPDATE public.answers SET review_status = p_status, row_version = row_version + 1, updated_by = auth.uid(), updated_at = now() WHERE id = p_answer RETURNING * INTO v;
  INSERT INTO public.answer_revisions(answer_id, assessment_id, project_id, question_id, row_version, state, value, notes, na_reason, confidence, review_status, changed_by)
  VALUES (v.id, v.assessment_id, v.project_id, v.question_id, v.row_version, v.state, v.value, v.notes, v.na_reason, v.confidence, v.review_status, auth.uid());
  INSERT INTO public.audit_events(project_id, assessment_id, actor, action, object_type, object_id, summary)
  VALUES (v.project_id, v.assessment_id, auth.uid(), 'answer.review', 'answer', v.question_id, 'Review status → ' || p_status);
END; $$;
GRANT EXECUTE ON FUNCTION public.set_answer_review(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.flag_answers_revalidation(p_assessment uuid, p_questions text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_project uuid;
BEGIN
  SELECT project_id INTO v_project FROM public.assessments WHERE id = p_assessment;
  IF NOT public.is_project_member(v_project) OR public.project_role_of(v_project) IN ('customer_reviewer','internal_viewer') THEN RAISE EXCEPTION 'not permitted'; END IF;
  UPDATE public.answers SET needs_revalidation = true WHERE assessment_id = p_assessment AND question_id = ANY(p_questions);
END; $$;
GRANT EXECUTE ON FUNCTION public.flag_answers_revalidation(uuid,text[]) TO authenticated;

-- Membership management
CREATE OR REPLACE FUNCTION public.add_project_member(p_project uuid, p_email text, p_role public.project_role, p_commercials boolean, p_modules text[], p_registers text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT public.is_project_lead(p_project) THEN RAISE EXCEPTION 'Only the engagement lead can manage members'; END IF;
  SELECT id INTO v_user FROM public.user_profiles WHERE lower(email) = lower(btrim(p_email));
  IF v_user IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF p_role IN ('customer_contributor','customer_reviewer') THEN p_commercials := false; END IF;
  INSERT INTO public.project_members(project_id, user_id, role, can_view_commercials, assigned_modules, assigned_registers, added_by)
  VALUES (p_project, v_user, p_role, coalesce(p_commercials,false), coalesce(p_modules,'{}'), coalesce(p_registers,'{}'), auth.uid())
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role, can_view_commercials = EXCLUDED.can_view_commercials,
    assigned_modules = EXCLUDED.assigned_modules, assigned_registers = EXCLUDED.assigned_registers;
  INSERT INTO public.audit_events(project_id, actor, action, object_type, object_id, summary)
  VALUES (p_project, auth.uid(), 'member.upsert', 'member', v_user::text, p_email || ' as ' || p_role::text);
  RETURN jsonb_build_object('status','ok');
END; $$;
GRANT EXECUTE ON FUNCTION public.add_project_member(uuid,text,public.project_role,boolean,text[],text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_project_member(p_project uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_project_lead(p_project) THEN RAISE EXCEPTION 'Only the engagement lead can manage members'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
  DELETE FROM public.project_members WHERE project_id = p_project AND user_id = p_user;
  INSERT INTO public.audit_events(project_id, actor, action, object_type, object_id, summary)
  VALUES (p_project, auth.uid(), 'member.remove', 'member', p_user::text, 'Member removed');
END; $$;
GRANT EXECUTE ON FUNCTION public.remove_project_member(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_internal_staff(p_email text, p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT public.has_app_role(auth.uid(),'workspace_admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT id INTO v_user FROM public.user_profiles WHERE lower(email) = lower(btrim(p_email));
  IF v_user IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF p_enabled THEN INSERT INTO public.app_user_roles(user_id, role) VALUES (v_user,'internal_staff') ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.app_user_roles WHERE user_id = v_user AND role = 'internal_staff'; END IF;
  RETURN jsonb_build_object('status','ok');
END; $$;
GRANT EXECUTE ON FUNCTION public.set_internal_staff(text,boolean) TO authenticated;
