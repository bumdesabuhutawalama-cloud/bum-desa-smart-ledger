import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

/**
 * Memaksa user yang bukan super admin hanya bisa mengakses unit usahanya sendiri.
 * Jika user mengakses unit lain → redirect ke unit miliknya (atau sign out kalau belum punya unit).
 */
export function useUnitAccessGuard(unitKode: "DAGANG" | "JASA" | "PANGAN" | "SP" | "PUSAT" | "PAM") {
  const { user, userUnit, isSuperAdmin, loading, signOut } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    if (isSuperAdmin) return; // super admin bebas akses semua unit

    if (!userUnit?.unit_kode) {
      toast.error("Akun Anda belum terhubung ke unit usaha. Silakan hubungi admin.");
      signOut();
      return;
    }

    if (userUnit.unit_kode !== unitKode) {
      toast.error(`Anda hanya memiliki akses ke unit ${userUnit.unit_nama ?? userUnit.unit_kode}.`);
      const targetKode = userUnit.unit_kode.toLowerCase();
      nav({ to: `/${targetKode}/dashboard` as any });
    }
  }, [loading, user, userUnit, isSuperAdmin, unitKode, nav, signOut]);
}
