import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { formatRp } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, roles } = useAuth();
  const [stats, setStats] = useState({ akun: 0, jurnal: 0, totalDebit: 0, totalKredit: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const PAGE = 1000;
      const [{ count: akun }, { count: jurnal }] = await Promise.all([
        supabase.from("accounts").select("*", { count: "exact", head: true }),
        supabase.from("journals").select("*", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setStats((s) => ({ ...s, akun: akun ?? 0, jurnal: jurnal ?? 0 }));

      // Stream journal_lines in pages so we don't block render or bust 1000-row cap
      let from = 0;
      let td = 0;
      let tk = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("journal_lines")
          .select("debit,kredit")
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        for (const l of data as any[]) { td += Number(l.debit); tk += Number(l.kredit); }
        if (cancelled) return;
        setStats((s) => ({ ...s, totalDebit: td, totalKredit: tk }));
        if (data.length < PAGE) break;
        from += PAGE;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Selamat datang, {user?.email}</h1>
        <p className="text-muted-foreground text-sm mt-1">Peran: <span className="capitalize">{roles.join(", ") || "-"}</span></p>
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
          Bagan Akun standar dengan 200+ akun siap pakai. Modul Jurnal, Buku Besar, Laporan Keuangan,
          Aset, Piutang, Utang, dan Persediaan akan dibangun bertahap di iterasi berikutnya.
        </p>
      </Card>
    </div>
  );
}
