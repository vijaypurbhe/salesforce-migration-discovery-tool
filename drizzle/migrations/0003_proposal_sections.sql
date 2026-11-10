CREATE TABLE public.proposal_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL, project_id uuid NOT NULL,
  section_no smallint NOT NULL CHECK (section_no BETWEEN 1 AND 12),
  body text NOT NULL DEFAULT '',
  internal_only boolean NOT NULL DEFAULT false,
  approved boolean NOT NULL DEFAULT false,
  updated_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, section_no),
  FOREIGN KEY (assessment_id, project_id) REFERENCES public.assessments(id, project_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_sections TO authenticated;
GRANT ALL ON public.proposal_sections TO service_role;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps read" ON public.proposal_sections FOR SELECT TO authenticated USING (public.is_internal_member(project_id) OR (public.is_project_member(project_id) AND NOT internal_only AND approved));
CREATE POLICY "ps write" ON public.proposal_sections FOR ALL TO authenticated USING (public.can_edit_internal(project_id)) WITH CHECK (public.can_edit_internal(project_id));
CREATE TRIGGER trg_proposal_sections_updated BEFORE UPDATE ON public.proposal_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();