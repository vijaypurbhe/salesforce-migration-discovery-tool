import { supabase } from "@/integrations/supabase/client";

export async function openPrivateWorkspace(input: { action: "create"; email: string } | { action: "resume"; token: string }) {
  const { data, error } = await supabase.functions.invoke("workspace-access", { body: input });
  if (error || data?.error || !data?.session) throw new Error(data?.error ?? "Could not open workspace. Please try again.");
  const { error: sessionError } = await supabase.auth.setSession(data.session);
  if (sessionError) throw sessionError;
  return `${window.location.origin}/auth#access=${data.private_token}`;
}