import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { formatRp } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useBusinessUnit } from "@/lib/unit-context";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, roles } = useAuth();
  const { currentUnitId, units } = useBusinessUnit();
  const [stats, setStats] = useState({ akun: 0, jurnal: 0, totalDebit: 0, totalKredit: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const PAGE = 1000;
      const akunQ = supabase.from("accounts").select("*", { count: "exact", head: true });
      let jurnalQ: any = supabase.from("journals").select("*", { count: "exact", head: true });
      if (currentUnitId !== "ALL") jurnalQ = jurnalQ.eq("business_unit_id", currentUnitId);
      const [{ count: akun }, { count: jurnal }] = await Promise.all([akunQ, jurnalQ]);
      if (cancelled) return;
      setStats({ akun: akun ?? 0, jurnal: jurnal ?? 0, totalDebit: 0, totalKredit: 0 });

      let from = 0;
      let td = 0;
      let tk = 0;
      while (true) {
        let q: any = supabase
          .from("journal_lines")
          .select("debit,kredit,journals!inner(business_unit_id)")
          .range(from, from + PAGE - 1);
        if (currentUnitId !== "ALL") q = q.eq("journals.business_unit_id", currentUnitId);
        const { data, error } = await q;
        if (error || !data || data.length === 0) break;
        for (const l of data as any[]) { td += Number(l.debit); tk += Number(l.kredit); }
        if (cancelled) return;
        setStats((s) => ({ ...s, totalDebit: td, totalKredit: tk }));
        if (data.length < PAGE) break;
        from += PAGE;
      }
    })();
    return () => { cancelled = true; };
  }, [currentUnitId]);

  const unitLabel = currentUnitId === "ALL"
    ? "Semua Unit (Konsolidasi)"
    : units.find((u) => u.id === currentUnitId)?.nama ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Selamat datang, {user?.email}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Peran: <span className="capitalize">{roles.join(", ") || "-"}</span> · Unit: <span className="font-medium text-foreground">{unitLabel}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><div className="text-xs text-muted-foreground">Total Akun</div><div className="mt-2 text-2xl font-bold">{stats.akun}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Jurnal</div><div className="mt-2 text-2xl font-bold">{stats.jurnal}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Total Debit</div><div className="mt-2 text-2xl font-bold text-debit">{formatRp(stats.totalDebit)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Total Kredit</div><div className="mt-2 text-2xl font-bold text-kredit">{formatRp(stats.totalKredit)}</div></Card>
      </div>
      <Card className="p-6">
        <h2 className="font-semibold">Sistem Akuntansi BUM Desa</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Aplikasi ini berbasis <strong>Kepmendesa 136/2022</strong> dengan prinsip akuntansi <strong>double-entry</strong> berbasis akrual.
          Gunakan dropdown <strong>Unit Usaha</strong> di header untuk memfilter dashboard & laporan per unit atau melihat konsolidasi.
        </p>
      </Card>
    </div>
  );
}
