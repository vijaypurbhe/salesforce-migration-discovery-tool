import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandMark } from "@/components/app/Brand";

const GoogleLogo = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

export default function AuthPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => { if (user) nav(loc.state?.from && loc.state.from.startsWith("/") ? loc.state.from : "/", { replace: true }); }, [user, nav, loc.state]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };
  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Use at least 8 characters for your password."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name } } });
    setBusy(false);
    if (error) toast.error(error.message); else setSent(`Check ${email} to confirm your account, then sign in.`);
  };
  const forgot = async () => {
    if (!email) { toast.error("Enter your email first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else setSent(`If an account exists for ${email}, a reset link is on its way.`);
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <BrandMark className="[&_div]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/70" />
        <div className="max-w-lg">
          <p className="kicker !text-primary-foreground/70">For SI sales, presales and consulting teams</p>
          <h1 className="text-4xl font-bold mt-3 leading-tight">Assess a Salesforce CPQ to Revenue Cloud move with evidence, not assumptions.</h1>
          <ul className="mt-8 space-y-3 text-primary-foreground/85">
            <li>• Conditional discovery across 127 questions in 15 modules</li>
            <li>• Traceable mapping, delta and fit-gap registers</li>
            <li>• Honest spider charts, readiness gates and sizing</li>
            <li>• Customer report and internal proposal pack kept separate</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">Migration is a reimplementation. This tool never promises one-click conversion or feature parity.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><BrandMark /></div>
          <h2 className="text-2xl font-bold">Welcome</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to continue your assessments.</p>
          {sent && <div role="status" className="mt-4 rounded-lg bg-teal-soft text-teal-soft-foreground p-3 text-sm">{sent}</div>}
          <Button type="button" variant="outline" onClick={google}
            className="mt-6 w-full h-10 gap-[10px] px-3 bg-[#FFFFFF] text-[#1F1F1F] border-[#747775] hover:bg-[#FFFFFF] hover:text-[#1F1F1F] font-medium">
            <GoogleLogo />Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Create account</TabsTrigger></TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 mt-3">
                <div><Label htmlFor="e1">Email</Label><Input id="e1" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label htmlFor="p1">Password</Label><Input id="p1" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
                <button type="button" onClick={forgot} className="text-xs text-teal hover:underline">Forgot password?</button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 mt-3">
                <div><Label htmlFor="n2">Full name</Label><Input id="n2" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label htmlFor="e2">Work email</Label><Input id="e2" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label htmlFor="p2">Password</Label><Input id="p2" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
                <p className="text-xs text-muted-foreground">Tech Mahindra emails get internal-team access. Customer users see only the projects they are invited to.</p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
