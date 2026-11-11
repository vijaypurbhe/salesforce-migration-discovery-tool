import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { openPrivateWorkspace } from "@/lib/privateAccess";
import { BrandMark } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [privateLink, setPrivateLink] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("access");
    if (!token) return;
    window.history.replaceState(null, "", window.location.pathname);
    setBusy(true);
    openPrivateWorkspace({ action: "resume", token }).then(() => nav("/", { replace: true })).catch(e => toast.error(e.message)).finally(() => setBusy(false));
  }, [nav]);
  const start = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { setPrivateLink(await openPrivateWorkspace({ action: "create", email })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <BrandMark />
        <div>
          <h1 className="text-2xl font-bold">Your assessment workspace</h1>
          <p className="text-sm text-muted-foreground mt-2">Use your email address to keep your assessments together.</p>
        </div>
        {privateLink ? <div className="space-y-3">
          <h2 className="font-semibold">Save your private access link</h2>
          <p className="text-sm text-muted-foreground">This link opens your records on any device. Keep it private; anyone with it can access your workspace.</p>
          <Button variant="outline" className="w-full" onClick={() => {
            const a = document.createElement("a");
            const url = URL.createObjectURL(new Blob([privateLink], { type: "text/plain" }));
            a.href = url; a.download = "private-workspace-link.txt"; a.click(); URL.revokeObjectURL(url);
          }}>Save private link</Button>
          <Button className="w-full" onClick={() => nav("/", { replace: true })}>Open workspace</Button>
        </div> : <form className="space-y-3" onSubmit={start}>
          <Label htmlFor="record-email">Email address</Label>
          <Input id="record-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button className="w-full" disabled={busy}>{busy ? "Opening…" : "Continue"}</Button>
          <p className="text-xs text-muted-foreground">No password or email verification. To reopen saved records, use your private access link.</p>
        </form>}
      </div>
    </main>
  );
}