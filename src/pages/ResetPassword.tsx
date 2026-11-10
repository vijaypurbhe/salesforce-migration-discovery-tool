import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [pw, setPw] = useState("");
  const nav = useNavigate();
  const isRecovery = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Use at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message); else { toast.success("Password updated"); nav("/"); }
  };
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm card-elevated p-6 space-y-4">
        <h1 className="text-xl font-bold">Set a new password</h1>
        {!isRecovery && <p className="text-sm text-muted-foreground">Open this page from the reset link in your email.</p>}
        <div><Label htmlFor="pw">New password</Label><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button className="w-full">Update password</Button>
      </form>
    </main>
  );
}
