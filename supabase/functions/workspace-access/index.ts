import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const hash = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), x => x.toString(16).padStart(2, "0")).join("");

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key || !anon) return reply(503, { error: "Workspace access is temporarily unavailable" });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await req.json();
    let email: string;
    let token: string;
    if (body.action === "create") {
      if (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return reply(400, { error: "Enter a valid email address" });
      email = body.email.trim().toLowerCase();
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, "0")).join("");
      // Synthetic auth identity is unrelated to the unverified email label.
      const authEmail = `workspace-${crypto.randomUUID()}@access.invalid`;
      const { data, error } = await admin.auth.admin.createUser({ email: authEmail, email_confirm: true });
      if (error || !data.user) throw new Error("Unable to create workspace");
      const uid = data.user.id;
      const { error: insertError } = await admin.from("private_workspace_access").insert({ user_id: uid, token_hash: await hash(token), email_label: email });
      if (insertError) throw new Error("Unable to save workspace access");
      const { error: roleError } = await admin.from("app_user_roles").insert({ user_id: uid, role: "internal_staff" });
      if (roleError) throw new Error("Unable to configure workspace");
      await admin.from("user_profiles").update({ email, display_name: email.split("@")[0] }).eq("id", uid);
      return await sessionFor(authEmail, token, email);
    }
    if (body.action !== "resume" || typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return reply(400, { error: "Invalid private access link" });
    token = body.token;
    const { data: access, error } = await admin.from("private_workspace_access").select("user_id,email_label").eq("token_hash", await hash(token)).is("revoked_at", null).maybeSingle();
    if (error || !access) return reply(401, { error: "This private access link is invalid or revoked" });
    const { data: owner } = await admin.auth.admin.getUserById(access.user_id);
    if (!owner.user?.email) return reply(401, { error: "Workspace access unavailable" });
    return await sessionFor(owner.user.email, token, access.email_label);

    async function sessionFor(authEmail: string, accessToken: string, label: string) {
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: authEmail });
      if (linkError || !link.properties?.hashed_token) throw new Error("Unable to open workspace");
      const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
      if (error || !data.session) throw new Error("Unable to open workspace");
      return reply(200, { session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token }, private_token: accessToken, email_label: label });
    }
  } catch {
    return reply(500, { error: "Could not open your workspace. Please try again." });
  }
});