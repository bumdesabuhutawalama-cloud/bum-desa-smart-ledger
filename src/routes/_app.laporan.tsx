import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRp, todayISO } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/laporan")({ component: Laporan });

type Acc = {
  id: string;
  kode_akun: string;
  nama_akun: string;
  tipe_akun:
    | "ASET"
    | "KEWAJIBAN"
    | "EKUITAS"
    | "PENDAPATAN"
    | "BEBAN"
    | "HPP"
    | "PENDAPATAN_LAIN"
    | "BEBAN_LAIN";
  normal_balance: "DEBIT" | "KREDIT";
};

type Line = {
  account_id: string;
  debit: number;
  kredit: number;
  tanggal: string;
};

function Laporan() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(todayISO());
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 CONTRA ACCOUNT DETECTOR
  const isContra = (acc: { kode_akun: string; nama_akun: string }) =>
    acc.kode_akun.startsWith("1.1.04") ||
    /penyisihan|akumulasi/i.test(acc.nama_akun);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: a, error: ea }, { data: l, error: el }] =
        await Promise.all([
          supabase
            .from("accounts")
            .select("id,kode_akun,nama_akun,tipe_akun,normal_balance")
            .eq("is_header", false),
          supabase
            .from("journal_lines")
            .select("account_id,debit,kredit,journals!inner(tanggal,status)")
            .lte("journals.tanggal", to)
            .gte("journals.tanggal", from)
            .eq("journals.status", "posted"),
        ]);

      if (ea) toast.error(ea.message);
      if (el) toast.error(el.message);

      setAccounts((a as Acc[]) ?? []);
      setLines(
        ((l as any[]) ?? []).map((x) => ({
          account_id: x.account_id,
          debit: Number(x.debit),
          kredit: Number(x.kredit),
          tanggal: x.journals.tanggal,
        }))
      );

      setLoading(false);
    })();
  }, [from, to]);

  // 🔥 SALDO
  const saldoMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts) m.set(a.id, 0);

    for (const ln of lines) {
      const acc = accounts.find((a) => a.id === ln.account_id);
      if (!acc) continue;

      const delta =
        acc.normal_balance === "DEBIT"
          ? ln.debit - ln.kredit
          : ln.kredit - ln.debit;

      m.set(ln.account_id, (m.get(ln.account_id) ?? 0) + delta);
    }

    return m;
  }, [accounts, lines]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {
      ASET: [],
      KEWAJIBAN: [],
      EKUITAS: [],
      PENDAPATAN: [],
      BEBAN: [],
      HPP: [],
      PENDAPATAN_LAIN: [],
      BEBAN_LAIN: [],
    };

    for (const a of accounts) {
      const saldo = saldoMap.get(a.id) ?? 0;
      if (Math.abs(saldo) < 0.005) continue;
      g[a.tipe_akun].push({ ...a, saldo });
    }

    Object.keys(g).forEach((k) =>
      g[k].sort((a, b) => a.kode_akun.localeCompare(b.kode_akun))
    );

    return g;
  }, [accounts, saldoMap]);

  const sum = (arr: any[]) => arr.reduce((s, x) => s + x.saldo, 0);

  // 🔥 TOTAL (FIX CONTRA)
  const totalAset = grouped.ASET.reduce((s, a) => {
    return isContra(a) ? s - a.saldo : s + a.saldo;
  }, 0);

  const totalKewajiban = sum(grouped.KEWAJIBAN);
  const totalPendapatan = sum(grouped.PENDAPATAN);
  const totalHPP = sum(grouped.HPP);
  const totalBeban = sum(grouped.BEBAN);
  const totalPendapatanLain = sum(grouped.PENDAPATAN_LAIN);
  const totalBebanLain = sum(grouped.BEBAN_LAIN);

  const labaKotor = totalPendapatan - totalHPP;
  const labaOperasi = labaKotor - totalBeban;
  const labaBersih =
    labaOperasi + totalPendapatanLain - totalBebanLain;

  const totalEkuitas = sum(grouped.EKUITAS) + labaBersih;

  if (loading) {
    return (
      <div className="p-10 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Laporan Keuangan</h1>

      <Card className="p-4 grid md:grid-cols-2 gap-3 max-w-xl">
        <div>
          <Label>Dari</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>Sampai</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <Tabs defaultValue="lr">
        <TabsList>
          <TabsTrigger value="lr">Laba Rugi</TabsTrigger>
          <TabsTrigger value="neraca">Neraca</TabsTrigger>
          <TabsTrigger value="ekuitas">Perubahan Ekuitas</TabsTrigger>
          <TabsTrigger value="arus">Arus Kas</TabsTrigger>
        </TabsList>

        {/* LABA RUGI */}
        <TabsContent value="lr">
          <Card className="p-6 space-y-3">
            <Section title="Pendapatan" items={grouped.PENDAPATAN} />
            <Section title="HPP" items={grouped.HPP} />
            <TotalRow label="Laba Kotor" value={labaKotor} />
            <Section title="Beban" items={grouped.BEBAN} />
            <TotalRow label="Laba Operasi" value={labaOperasi} />
            <TotalRow label="LABA BERSIH" value={labaBersih} strong />
          </Card>
        </TabsContent>

        {/* NERACA */}
        <TabsContent value="neraca">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3>ASET</h3>
              <Section items={grouped.ASET} />
            </Card>

            <Card className="p-6 space-y-3">
              <h3>KEWAJIBAN</h3>
              <Section items={grouped.KEWAJIBAN} />
              <h3>EKUITAS</h3>
              <Section items={grouped.EKUITAS} />
              <TotalRow label="Laba Berjalan" value={labaBersih} />
              <TotalRow label="Total Ekuitas" value={totalEkuitas} />

              <TotalRow
                label="TOTAL KEWAJIBAN + EKUITAS"
                value={totalKewajiban + totalEkuitas}
                strong
              />

              {Math.abs(totalAset - (totalKewajiban + totalEkuitas)) > 1 && (
                <div className="text-red-500">
                  Tidak balance: {formatRp(totalAset - (totalKewajiban + totalEkuitas))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* EKUITAS */}
        <TabsContent value="ekuitas">
          <Card className="p-6 space-y-2">
            <Row label="Modal Awal" value={sum(grouped.EKUITAS)} />
            <Row label="Laba Bersih" value={labaBersih} />
            <TotalRow label="Saldo Akhir Ekuitas" value={totalEkuitas} strong />
          </Card>
        </TabsContent>

        {/* ARUS KAS */}
        <TabsContent value="arus">
          <ArusKas accounts={accounts} lines={lines} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 🔥 COMPONENTS
function Section({ title, items }: any) {
  const isContra = (it: any) =>
    it.kode_akun.startsWith("1.1.04") ||
    /penyisihan|akumulasi/i.test(it.nama_akun);

  return (
    <div>
      {title && <h4>{title}</h4>}
      {items.map((it: any) => (
        <div key={it.id} className="flex justify-between">
          <span>{it.nama_akun}</span>
          <span>
            {isContra(it) ? `(${formatRp(it.saldo)})` : formatRp(it.saldo)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: any) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{formatRp(value)}</span>
    </div>
  );
}

function TotalRow({ label, value, strong }: any) {
  return (
    <div className={`flex justify-between border-t pt-2 ${strong ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{formatRp(value)}</span>
    </div>
  );
}

function ArusKas({ accounts, lines }: any) {
  const kasIds = new Set(
    accounts
      .filter((a: any) => /kas|bank/i.test(a.nama_akun))
      .map((a: any) => a.id)
  );

  const masuk = lines
    .filter((l: any) => kasIds.has(l.account_id))
    .reduce((s: number, l: any) => s + l.debit, 0);

  const keluar = lines
    .filter((l: any) => kasIds.has(l.account_id))
    .reduce((s: number, l: any) => s + l.kredit, 0);

  return (
    <Card className="p-6">
      <Row label="Kas Masuk" value={masuk} />
      <Row label="Kas Keluar" value={-keluar} />
      <TotalRow label="Saldo Bersih" value={masuk - keluar} strong />
    </Card>
  );
}
