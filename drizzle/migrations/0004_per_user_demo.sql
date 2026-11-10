CREATE OR REPLACE FUNCTION public.join_demo_project()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_customer uuid; v_project uuid; v_assessment uuid; v_fresh boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  -- Each user gets an isolated synthetic demo project
  SELECT id INTO v_project FROM public.projects WHERE is_demo AND created_by = auth.uid() ORDER BY created_at LIMIT 1;
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
REVOKE EXECUTE ON FUNCTION public.join_demo_project() FROM anon;