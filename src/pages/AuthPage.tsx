import { useState } from "react";
import { BrandMark } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <BrandMark />
        <div>
          <h1 className="text-2xl font-bold">Your assessment workspace</h1>
          <p className="text-sm text-muted-foreground mt-2">Use your email address to keep your assessments together.</p>
        </div>
        <div className="space-y-3">
          <Label htmlFor="record-email">Email address</Label>
          <Input id="record-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button className="w-full" disabled>Continue</Button>
          <p role="status" className="text-xs text-muted-foreground">Email-only access is being configured. Saved assessments remain protected.</p>
        </div>
      </div>
    </main>
  );
}