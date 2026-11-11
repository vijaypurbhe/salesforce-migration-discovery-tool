CREATE TABLE public.private_workspace_access (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE,
 token_hash text NOT NULL UNIQUE, email_label text NOT NULL,
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.private_workspace_access TO service_role;
ALTER TABLE public.private_workspace_access ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.private_workspace_access IS 'Server-only hashed bearer access capabilities; email labels never authorize access.';
CREATE OR REPLACE FUNCTION public.handle_studio_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.user_profiles(id, email, display_name)
 VALUES (NEW.id, coalesce(NEW.email,''), coalesce(NEW.raw_user_meta_data->>'display_name',split_part(coalesce(NEW.email,''),'@',1))) ON CONFLICT(id) DO NOTHING;
 -- Staff and administrator privileges are assigned only by trusted server code, never email labels or editable metadata.
 RETURN NEW;
END; $$;