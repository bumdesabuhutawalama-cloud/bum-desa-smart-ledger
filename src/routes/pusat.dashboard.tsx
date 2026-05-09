// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRp } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import {
  Building2, ShoppingCart, Leaf, Briefcase, PiggyBank,
  LayoutDashboard, FileText, ArrowRightLeft, Users, Store,
  TrendingUp, Wallet, LogOut,
} from "lucide-react";

export const Route = createFileRoute("/pusat/dashboard")({
  head: () => ({
    meta: [
      { title: "Unit Pusat — Dashboard Konsolidasi BUM Desa" },
      { name: "description", content: "Dashboard konsolidasi BUM Desa: ringkasan seluruh unit usaha, modal, dan laporan keuangan." },
    ],
  }),
  component: PusatDashboard,
});

const UNIT_META: Record<string, { label: string; icon: any; color: string; route: string }> = {
  DAGANG:  { label: "Unit Perdagangan",      icon: ShoppingCart, color: "bg-blue-500",    route: "/dagang/dashboard" },
  PANGAN:  { label: "Unit Ketahanan Pangan", icon: Leaf,         color: "bg-emerald-500", route: "/pangan/dashboard" },
  JASA:    { label: "Unit Jasa",             icon: Briefcase,    color: "bg-purple-500",  route: "/jasa/dashboard" },
  SP:      { label: "Unit Simpan Pinjam",    icon: PiggyBank,    color: "bg-orange-500",  route: "/sp/dashboard" },
};

type UnitRow = { id: string; kode: string; nama: string; is_head_office: boolean };
type Stats = { jurnal: number; debit: number; kredit: number };

function PusatDashboard() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [statsByUnit, setStatsByUnit] = useState<Record<string, Stats>>({});
  const [totalAkun, setTotalAkun] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: bus } = await supabase
        .from("business_units")
        .select("id, kode, nama, is_head_office")
        .eq("is_active", true)
        .order("kode");
      if (cancelled) return;
      const list = (bus ?? []) as UnitRow[];
      setUnits(list);

      const [{ count: akun }, { count: usrs }] = await Promise.all([
        supabase.from("accounts").select("*", { count: "exact", head: true }),
        (supabase as any).from("user_business_units").select("*", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setTotalAkun(akun ?? 0);
      setTotalUsers(usrs ?? 0);

      const result: Record<string, Stats> = {};
      for (const u of list) {
        const { count: jurnalCount } = await supabase
          .from("journals")
          .select("*", { count: "exact", head: true })
          .eq("business_unit_id", u.id);
        let debit = 0, kredit = 0, from = 0;
        const PAGE = 1000;
        while (true) {
          const { data, error } = await supabase
            .from("journal_lines")
            .select("debit, kredit, journals!inner(business_unit_id)")
            .eq("journals.business_unit_id", u.id)
            .range(from, from + PAGE - 1);
          if (error || !data || data.length === 0) break;
          for (const l of data as any[]) { debit += Number(l.debit); kredit += Number(l.kredit); }
          if (data.length < PAGE) break;
          from += PAGE;
        }
        result[u.id] = { jurnal: jurnalCount ?? 0, debit, kredit };
        if (cancelled) return;
        setStatsByUnit({ ...result });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const totals = Object.values(statsByUnit).reduce(
    (acc, s) => ({ jurnal: acc.jurnal + s.jurnal, debit: acc.debit + s.debit, kredit: acc.kredit + s.kredit }),
    { jurnal: 0, debit: 0, kredit: 0 },
  );

  const operasionalUnits = units.filter((u) => !u.is_head_office && UNIT_META[u.kode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-slate-700 grid place-items-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-slate-300 uppercase tracking-wider">BUM Desa Smart Ledger</div>
              <h1 className="text-xl font-bold">Unit Pusat — Konsolidasi</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right text-xs">
              <div className="text-slate-300">Login sebagai</div>
              <div className="font-medium truncate max-w-[200px]">{user?.email}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
              onClick={async () => { await signOut(); nav({ to: "/" }); }}
            >
              <LogOut className="h-4 w-4 mr-1.5" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Aksi Cepat</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/dashboard">
              <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 border-l-slate-700">
                <LayoutDashboard className="h-5 w-5 text-slate-700 mb-2" />
                <div className="font-semibold text-sm">Dashboard Konsolidasi</div>
                <div className="text-xs text-muted-foreground mt-0.5">Ringkasan seluruh unit</div>
              </Card>
            </Link>
            <Link to="/laporan">
              <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 border-l-emerald-600">
                <TrendingUp className="h-5 w-5 text-emerald-600 mb-2" />
                <div className="font-semibold text-sm">Laporan Keuangan</div>
                <div className="text-xs text-muted-foreground mt-0.5">Neraca, L/R, Arus kas</div>
              </Card>
            </Link>
            <Link to="/transfer">
              <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 border-l-blue-600">
                <ArrowRightLeft className="h-5 w-5 text-blue-600 mb-2" />
                <div className="font-semibold text-sm">Transfer Antar Unit</div>
                <div className="text-xs text-muted-foreground mt-0.5">Penyertaan & distribusi modal</div>
              </Card>
            </Link>
            <Link to="/unit-usaha">
              <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 border-l-purple-600">
                <Users className="h-5 w-5 text-purple-600 mb-2" />
                <div className="font-semibold text-sm">Kelola Unit Usaha</div>
                <div className="text-xs text-muted-foreground mt-0.5">Tambah / atur unit</div>
              </Card>
            </Link>
          </div>
        </section>

        {/* KPI Konsolidasi */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Ringkasan Konsolidasi</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="text-xs text-muted-foreground">Total Unit Usaha</div>
              <div className="mt-2 text-2xl font-bold">{units.length}</div>
              <div className="text-xs text-muted-foreground mt-1">{operasionalUnits.length} unit operasional</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-muted-foreground">Total Jurnal</div>
              <div className="mt-2 text-2xl font-bold">{totals.jurnal.toLocaleString("id-ID")}</div>
              <div className="text-xs text-muted-foreground mt-1">{totalAkun} akun aktif</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-muted-foreground">Total Debit</div>
              <div className="mt-2 text-xl md:text-2xl font-bold text-debit">{formatRp(totals.debit)}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-muted-foreground">Total Kredit</div>
              <div className="mt-2 text-xl md:text-2xl font-bold text-kredit">{formatRp(totals.kredit)}</div>
            </Card>
          </div>
        </section>

        {/* Per-Unit cards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Ringkasan Per Unit Usaha</h2>
            {loading && <span className="text-xs text-muted-foreground">Memuat data…</span>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {operasionalUnits.map((u) => {
              const meta = UNIT_META[u.kode];
              const Icon = meta?.icon ?? Store;
              const s = statsByUnit[u.id] ?? { jurnal: 0, debit: 0, kredit: 0 };
              return (
                <Card key={u.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-lg ${meta?.color ?? "bg-slate-500"} grid place-items-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold">{u.nama}</div>
                        <Badge variant="secondary" className="mt-1 text-[10px]">{u.kode}</Badge>
                      </div>
                    </div>
                    {meta?.route && (
                      <Link to={meta.route as any}>
                        <Button variant="outline" size="sm">Buka</Button>
                      </Link>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Jurnal</div>
                      <div className="font-semibold mt-0.5">{s.jurnal.toLocaleString("id-ID")}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Debit</div>
                      <div className="font-semibold mt-0.5 text-debit text-sm">{formatRp(s.debit)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Kredit</div>
                      <div className="font-semibold mt-0.5 text-kredit text-sm">{formatRp(s.kredit)}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {!loading && operasionalUnits.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground md:col-span-2">
                Belum ada unit operasional terdaftar.
              </Card>
            )}
          </div>
        </section>

        {/* Tata kelola */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Tata Kelola</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <Wallet className="h-5 w-5 text-slate-700 mb-2" />
              <div className="font-semibold">Penyertaan & Distribusi Modal</div>
              <p className="text-xs text-muted-foreground mt-1">
                Catat penyertaan modal masuk dan distribusikan ke unit usaha.
              </p>
              <Link to="/transfer" className="inline-block mt-3">
                <Button size="sm" variant="outline">Buka Transfer</Button>
              </Link>
            </Card>
            <Card className="p-5">
              <FileText className="h-5 w-5 text-slate-700 mb-2" />
              <div className="font-semibold">Jurnal Umum & Koreksi</div>
              <p className="text-xs text-muted-foreground mt-1">
                Buat jurnal umum, posting, dan koreksi lintas unit.
              </p>
              <Link to="/jurnal" className="inline-block mt-3">
                <Button size="sm" variant="outline">Buka Jurnal</Button>
              </Link>
            </Card>
            <Card className="p-5">
              <Users className="h-5 w-5 text-slate-700 mb-2" />
              <div className="font-semibold">Pengguna Sistem</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total <b>{totalUsers}</b> pengguna terdaftar di seluruh unit.
              </p>
              <Link to="/data-master" className="inline-block mt-3">
                <Button size="sm" variant="outline">Data Master</Button>
              </Link>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
