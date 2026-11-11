import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

interface Profile { id: string; email: string; display_name: string; organisation: string }
interface AuthState {
  session: Session | null; user: User | null; profile: Profile | null; loading: boolean;
  isAdmin: boolean; isInternal: boolean; refresh: () => Promise<void>; signOut: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string | undefined) => {
    if (!uid) { setProfile(null); setRoles([]); return; }
    const [{ data: p }, { data: r }] = await Promise.all([
      db.from("user_profiles").select("*").eq("id", uid).maybeSingle(),
      db.from("app_user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p ?? null);
    setRoles((r ?? []).map((x: { role: string }) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => load(s?.user?.id).finally(() => setLoading(false)), 0);
    });
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setSession(null); await load(undefined); setLoading(false); return; }
      const { data: stored } = await supabase.auth.getSession();
      setSession(stored.session);
      load(data.user.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session, user: session?.user ?? null, profile, loading,
    isAdmin: roles.includes("workspace_admin"), isInternal: roles.includes("internal_staff"),
    refresh: () => load(session?.user?.id),
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
};
