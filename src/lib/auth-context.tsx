import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "bendahara" | "auditor" | "super_admin" | "admin_unit" | "staff_unit";

export type UserBusinessUnit = {
  business_unit_id: string | null;
  role: AppRole;
  unit_kode?: string | null;
  unit_nama?: string | null;
  is_head_office?: boolean;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  /** Mapping user → unit (single row) */
  userUnit: UserBusinessUnit | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  canEdit: boolean;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [userUnit, setUserUnit] = useState<UserBusinessUnit | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserContext = async (uid: string) => {
    const [{ data: roleRows }, { data: ubuRows }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      (supabase as any)
        .from("user_business_units")
        .select("business_unit_id, role, business_units(kode, nama, is_head_office)")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    setRoles((roleRows?.map((r: any) => r.role) ?? []) as AppRole[]);
    if (ubuRows) {
      setUserUnit({
        business_unit_id: ubuRows.business_unit_id,
        role: ubuRows.role as AppRole,
        unit_kode: ubuRows.business_units?.kode ?? null,
        unit_nama: ubuRows.business_units?.nama ?? null,
        is_head_office: ubuRows.business_units?.is_head_office ?? false,
      });
    } else {
      setUserUnit(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => { loadUserContext(s.user.id); }, 0);
      } else {
        setRoles([]);
        setUserUnit(null);
      }
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadUserContext(s.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (r: AppRole) => roles.includes(r) || userUnit?.role === r;
  const isSuperAdmin =
    userUnit?.role === "super_admin" ||
    userUnit?.is_head_office === true ||
    roles.includes("admin"); // backward compat
  const canEdit =
    isSuperAdmin ||
    userUnit?.role === "admin_unit" ||
    userUnit?.role === "staff_unit" ||
    roles.includes("bendahara");

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  return (
    <Ctx.Provider
      value={{
        user, session, roles, userUnit, isSuperAdmin, loading,
        signIn,
        signOut: async () => { await supabase.auth.signOut(); },
        hasRole, canEdit,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
