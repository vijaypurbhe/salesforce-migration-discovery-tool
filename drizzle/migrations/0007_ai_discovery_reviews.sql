CREATE TABLE public.ai_discovery_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL, project_id uuid NOT NULL,
 notes text NOT NULL CHECK (length(notes) BETWEEN 1 AND 20000), result jsonb, model text,
 approved boolean NOT NULL DEFAULT false, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_discovery_reviews TO authenticated;
GRANT ALL ON public.ai_discovery_reviews TO service_role;
ALTER TABLE public.ai_discovery_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review read" ON public.ai_discovery_reviews FOR SELECT TO authenticated USING (public.is_internal_member(project_id) OR (public.is_project_member(project_id) AND approved));
CREATE POLICY "review insert" ON public.ai_discovery_reviews FOR INSERT TO authenticated WITH CHECK (public.can_edit_internal(project_id) AND created_by = auth.uid());
CREATE POLICY "review update" ON public.ai_discovery_reviews FOR UPDATE TO authenticated USING (public.can_edit_internal(project_id)) WITH CHECK (public.can_edit_internal(project_id));
CREATE INDEX ai_discovery_reviews_assessment ON public.ai_discovery_reviews(assessment_id, created_at DESC);