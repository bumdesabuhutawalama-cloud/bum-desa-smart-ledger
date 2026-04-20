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
  tipe_akun: "ASET" | "KEWAJIBAN" | "EKUITAS" | "PENDAPATAN" | "BEBAN" | "HPP" | "PENDAPATAN_LAIN" | "BEBAN_LAIN";
  normal_balance: "DEBIT" | "KREDIT";
};
type Line = { account_id: string; debit: number; kredit: number; tanggal: string };

function Laporan() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(todayISO());
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: a, error: ea }, { data: l, error: el }] = await Promise.all([
        supabase.from("accounts").select("id,kode_akun,nama_akun,tipe_akun,normal_balance").eq("is_header", false),
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
      setLines(((l as unknown as Array<{ account_id: string; debit: number; kredit: number; journals: { tanggal: string } }>) ?? []).map((x) => ({
        account_id: x.account_id, debit: Number(x.debit), kredit: Number(x.kredit), tanggal: x.journals.tanggal,
      })));
      setLoading(false);
    })();
  }, [from, to]);

  // Saldo per akun pada periode
  const saldoMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts) m.set(a.id, 0);
    for (const ln of lines) {
      const acc = accounts.find((a) => a.id === ln.account_id);
      if (!acc) continue;
      const delta = acc.normal_balance === "DEBIT" ? ln.debit - ln.kredit : ln.kredit - ln.debit;
      m.set(ln.account_id, (m.get(ln.account_id) ?? 0) + delta);
    }
    return m;
  }, [accounts, lines]);

  const grouped = useMemo(() => {
    const groups: Record<string, Array<Acc & { saldo: number }>> = {
      ASET: [], KEWAJIBAN: [], EKUITAS: [], PENDAPATAN: [], BEBAN: [], HPP: [], PENDAPATAN_LAIN: [], BEBAN_LAIN: [],
    };
    for (const a of accounts) {
      const saldo = saldoMap.get(a.id) ?? 0;
      if (Math.abs(saldo) < 0.005) continue;
      groups[a.tipe_akun]?.push({ ...a, saldo });
    }
    for (const k of Object.keys(groups)) groups[k].sort((x, y) => x.kode_akun.localeCompare(y.kode_akun));
    return groups;
  }, [accounts, saldoMap]);

  const sum = (arr: Array<{ saldo: number }>) => arr.reduce((s, x) => s + x.saldo, 0);

  const totalAset = sum(grouped.ASET);
  const totalKewajiban = sum(grouped.KEWAJIBAN);
  const totalPendapatan = sum(grouped.PENDAPATAN);
  const totalPendapatanLain = sum(grouped.PENDAPATAN_LAIN);
  const totalHPP = sum(grouped.HPP);
  const totalBeban = sum(grouped.BEBAN);
  const totalBebanLain = sum(grouped.BEBAN_LAIN);
  const labaKotor = totalPendapatan - totalHPP;
  const labaOperasi = labaKotor - totalBeban;
  const labaBersih = labaOperasi + totalPendapatanLain - totalBebanLain;
  const totalEkuitas = sum(grouped.EKUITAS) + labaBersih;

  if (loading) {
    return <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
        <p className="text-sm text-muted-foreground">Dihitung otomatis dari jurnal terposting</p>
      </div>

      <Card className="p-4 grid md:grid-cols-2 gap-3 max-w-xl">
        <div><Label>Periode dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" /></div>
        <div><Label>sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" /></div>
      </Card>

      <Tabs defaultValue="lr">
        <TabsList>
          <TabsTrigger value="lr">Laba Rugi</TabsTrigger>
          <TabsTrigger value="neraca">Neraca</TabsTrigger>
          <TabsTrigger value="ekuitas">Perubahan Ekuitas</TabsTrigger>
          <TabsTrigger value="arus">Arus Kas</TabsTrigger>
        </TabsList>

        <TabsContent value="lr">
          <Card className="p-6 space-y-4">
            <Section title="Pendapatan" items={grouped.PENDAPATAN} total={totalPendapatan} />
            <Section title="Harga Pokok Penjualan" items={grouped.HPP} total={totalHPP} />
            <TotalRow label="Laba Kotor" value={labaKotor} accent />
            <Section title="Beban Operasional" items={grouped.BEBAN} total={totalBeban} />
            <TotalRow label="Laba Operasi" value={labaOperasi} accent />
            <Section title="Pendapatan Lain-lain" items={grouped.PENDAPATAN_LAIN} total={totalPendapatanLain} />
            <Section title="Beban Lain-lain" items={grouped.BEBAN_LAIN} total={totalBebanLain} />
            <TotalRow label="LABA BERSIH" value={labaBersih} accent strong />
          </Card>
        </TabsContent>

        <TabsContent value="neraca">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-3">ASET</h3>
              <Section items={grouped.ASET} total={totalAset} compact />
            </Card>
            <Card className="p-6 space-y-3">
              <div>
                <h3 className="font-semibold mb-3">KEWAJIBAN</h3>
                <Section items={grouped.KEWAJIBAN} total={totalKewajiban} compact />
              </div>
              <div>
                <h3 className="font-semibold mb-3">EKUITAS</h3>
                <Section items={grouped.EKUITAS} total={sum(grouped.EKUITAS)} compact />
                <TotalRow label="Laba Berjalan" value={labaBersih} />
                <TotalRow label="Total Ekuitas" value={totalEkuitas} accent />
              </div>
              <TotalRow label="TOTAL KEWAJIBAN + EKUITAS" value={totalKewajiban + totalEkuitas} accent strong />
              {Math.abs(totalAset - (totalKewajiban + totalEkuitas)) > 1 && (
                <div className="text-sm text-destructive">⚠ Tidak balance: selisih {formatRp(totalAset - (totalKewajiban + totalEkuitas))}</div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ekuitas">
          <Card className="p-6 space-y-2">
            <Row label="Modal awal periode" value={sum(grouped.EKUITAS)} />
            <Row label="Laba bersih periode berjalan" value={labaBersih} />
            <TotalRow label="Saldo akhir ekuitas" value={totalEkuitas} accent strong />
          </Card>
        </TabsContent>

        <TabsContent value="arus">
          <ArusKas accounts={accounts} lines={lines} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, items, total, compact }: { title?: string; items: Array<{ id: string; kode_akun: string; nama_akun: string; saldo: number }>; total: number; compact?: boolean }) {
  return (
    <div>
      {title && <h4 className="font-medium text-sm uppercase text-muted-foreground mb-2">{title}</h4>}
      <div className="space-y-1">
        {items.length === 0 && <div className="text-sm text-muted-foreground italic">— tidak ada saldo —</div>}
        {items.map((it) => (
          <div key={it.id} className="flex justify-between text-sm">
            <span><span className="font-mono text-xs text-muted-foreground mr-2">{it.kode_akun}</span>{it.nama_akun}</span>
            <span className="font-mono">{formatRp(it.saldo)}</span>
          </div>
        ))}
      </div>
      {!compact && <div className="flex justify-between text-sm font-medium border-t mt-2 pt-2"><span>Total {title}</span><span className="font-mono">{formatRp(total)}</span></div>}
      {compact && <div className="flex justify-between text-sm font-semibold border-t mt-2 pt-2"><span>Total</span><span className="font-mono">{formatRp(total)}</span></div>}
    </div>
  );
}
function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-sm"><span>{label}</span><span className="font-mono">{formatRp(value)}</span></div>;
}
function TotalRow({ label, value, accent, strong }: { label: string; value: number; accent?: boolean; strong?: boolean }) {
  return (
    <div className={`flex justify-between border-t pt-2 ${accent ? "text-primary" : ""} ${strong ? "text-base font-bold" : "font-medium"}`}>
      <span>{label}</span><span className="font-mono">{formatRp(value)}</span>
    </div>
  );
}

function ArusKas({ accounts, lines }: { accounts: Acc[]; lines: Line[] }) {
  // Pendekatan langsung sederhana: rangkum mutasi akun kas/bank (kode 1.1.01.xx atau nama mengandung "kas"/"bank")
  const kasAccs = accounts.filter((a) => /^1\.1\.01/.test(a.kode_akun) || /kas|bank/i.test(a.nama_akun));
  const kasIds = new Set(kasAccs.map((a) => a.id));
  const masuk = lines.filter((l) => kasIds.has(l.account_id)).reduce((s, l) => s + l.debit, 0);
  const keluar = lines.filter((l) => kasIds.has(l.account_id)).reduce((s, l) => s + l.kredit, 0);
  const saldo = masuk - keluar;
  return (
    <Card className="p-6 space-y-2">
      <h4 className="font-medium text-sm uppercase text-muted-foreground">Arus Kas (Metode Langsung — Ringkasan)</h4>
      <Row label="Penerimaan kas" value={masuk} />
      <Row label="Pengeluaran kas" value={-keluar} />
      <TotalRow label="Kenaikan/(Penurunan) Kas Bersih" value={saldo} accent strong />
      <div className="text-xs text-muted-foreground">Diambil dari mutasi akun kas/bank. Klasifikasi operasi/investasi/pendanaan menyusul.</div>
    </Card>
  );
}
