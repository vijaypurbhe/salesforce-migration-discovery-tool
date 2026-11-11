CREATE TABLE public.customer_surveys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'), recipient_label text NOT NULL DEFAULT '',
 scope text NOT NULL CHECK (scope IN ('quick','full')), question_ids text[] NOT NULL,
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
 revoked_at timestamptz, submitted_at timestamptz, imported_at timestamptz, respondent_email text, responses jsonb NOT NULL DEFAULT '{}', row_version integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.customer_surveys TO authenticated;
GRANT ALL ON public.customer_surveys TO service_role;
ALTER TABLE public.customer_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal survey review" ON public.customer_surveys FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.is_internal_member(a.project_id)));
CREATE OR REPLACE FUNCTION public.import_customer_survey(p_survey uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.customer_surveys; a public.assessments; r record; result jsonb; n integer := 0; skipped integer := 0;
BEGIN
 SELECT * INTO s FROM public.customer_surveys WHERE id = p_survey FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Survey not found'; END IF;
 SELECT * INTO a FROM public.assessments WHERE id = s.assessment_id;
 IF NOT public.can_edit_internal(a.project_id) THEN RAISE EXCEPTION 'Not permitted'; END IF;
 IF s.submitted_at IS NULL THEN RAISE EXCEPTION 'Customer has not submitted the survey'; END IF;
 IF s.imported_at IS NOT NULL THEN RAISE EXCEPTION 'Survey already imported'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text, 0));
 FOR r IN SELECT key, value FROM jsonb_each(s.responses) LOOP
  IF NOT (r.key = ANY(s.question_ids)) OR r.key IN ('B07','T08') THEN RAISE EXCEPTION 'Invalid question'; END IF;
  IF EXISTS (SELECT 1 FROM public.answers WHERE assessment_id = a.id AND question_id = r.key AND instance_key = '') THEN skipped := skipped + 1; CONTINUE; END IF;
  result := public.save_answer(a.id,r.key,'',r.value->>'state',r.value->'value',r.value->>'notes',r.value->>'na_reason','self_reported',0,s.respondent_email,NULL);
  IF result->>'status' = 'saved' THEN n := n + 1; ELSE skipped := skipped + 1; END IF;
 END LOOP;
 UPDATE public.customer_surveys SET imported_at = now() WHERE id = s.id;
 INSERT INTO public.audit_events(project_id,assessment_id,actor,action,object_type,object_id,summary) VALUES(a.project_id,a.id,auth.uid(),'survey.imported','survey',s.id::text,n::text || ' customer responses imported; existing answers preserved');
 RETURN jsonb_build_object('imported',n,'skipped',skipped);
END; $$;
REVOKE ALL ON FUNCTION public.import_customer_survey(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_customer_survey(uuid) TO authenticated;