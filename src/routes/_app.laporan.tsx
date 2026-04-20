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

  // 🔥 DETEKSI CONTRA ACCOUNT
  const isContraAccount = (acc: { kode_akun: string; nama_akun: string }) => {
    return (
      acc.kode_akun.startsWith("1.1.04") || // penyisihan piutang
      /penyisihan|akumulasi/i.test(acc.nama_akun)
    );
  };

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: a, error: ea }, { data: l, error: el }] =
        await Promise.all([
          supabase
            .from("accounts")
            .select(
              "id,kode_akun,nama_akun,tipe_akun,normal_balance"
            )
            .eq("is_header", false),
          supabase
            .from("journal_lines")
            .select(
              "account_id,debit,kredit,journals!inner(tanggal,status)"
            )
            .lte("journals.tanggal", to)
            .gte("journals.tanggal", from)
            .eq("journals.status", "posted"),
        ]);

      if (ea) toast.error(ea.message);
      if (el) toast.error(el.message);

      setAccounts((a as Acc[]) ?? []);

      setLines(
        (
          (l as unknown as Array<{
            account_id: string;
            debit: number;
            kredit: number;
            journals: { tanggal: string };
          }>) ?? []
        ).map((x) => ({
          account_id: x.account_id,
          debit: Number(x.debit),
          kredit: Number(x.kredit),
          tanggal: x.journals.tanggal,
        }))
      );

      setLoading(false);
    })();
  }, [from, to]);

  // 🔥 HITUNG SALDO
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

  // 🔥 GROUPING
  const grouped = useMemo(() => {
    const groups: Record<string, Array<Acc & { saldo: number }>> = {
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

      groups[a.tipe_akun]?.push({ ...a, saldo });
    }

    for (const k of Object.keys(groups)) {
      groups[k].sort((x, y) =>
        x.kode_akun.localeCompare(y.kode_akun)
      );
    }

    return groups;
  }, [accounts, saldoMap]);

  const sumNormal = (arr: Array<{ saldo: number }>) =>
    arr.reduce((s, x) => s + x.saldo, 0);

  // 🔥 FIX TOTAL ASET (HANDLE CONTRA)
  const totalAset = grouped.ASET.reduce((s, acc) => {
    return isContraAccount(acc) ? s - acc.saldo : s + acc.saldo;
  }, 0);

  const totalKewajiban = sumNormal(grouped.KEWAJIBAN);
  const totalPendapatan = sumNormal(grouped.PENDAPATAN);
  const totalPendapatanLain = sumNormal(grouped.PENDAPATAN_LAIN);
  const totalHPP = sumNormal(grouped.HPP);
  const totalBeban = sumNormal(grouped.BEBAN);
  const totalBebanLain = sumNormal(grouped.BEBAN_LAIN);

  const labaKotor = totalPendapatan - totalHPP;
  const labaOperasi = labaKotor - totalBeban;
  const labaBersih =
    labaOperasi + totalPendapatanLain - totalBebanLain;

  const totalEkuitas = sumNormal(grouped.EKUITAS) + labaBersih;

  if (loading) {
    return (
      <div className="p-10 grid place-items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          Laporan Keuangan
        </h1>
        <p className="text-sm text-muted-foreground">
          Dihitung otomatis dari jurnal terposting
        </p>
      </div>

      <Card className="p-4 grid md:grid-cols-2 gap-3 max-w-xl">
        <div>
          <Label>Periode dari</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>sampai</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1"
          />
        </div>
      </Card>

      <Tabs defaultValue="neraca">
        <TabsList>
          <TabsTrigger value="lr">Laba Rugi</TabsTrigger>
          <TabsTrigger value="neraca">Neraca</TabsTrigger>
          <TabsTrigger value="ekuitas">
            Perubahan Ekuitas
          </TabsTrigger>
          <TabsTrigger value="arus">Arus Kas</TabsTrigger>
        </TabsList>

        {/* NERACA */}
        <TabsContent value="neraca">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-3">ASET</h3>
              <Section items={grouped.ASET} compact />
            </Card>

            <Card className="p-6 space-y-3">
              <div>
                <h3 className="font-semibold mb-3">
                  KEWAJIBAN
                </h3>
                <Section items={grouped.KEWAJIBAN} compact />
              </div>

              <div>
                <h3 className="font-semibold mb-3">
                  EKUITAS
                </h3>
                <Section items={grouped.EKUITAS} compact />
                <TotalRow label="Laba Berjalan" value={labaBersih} />
                <TotalRow
                  label="Total Ekuitas"
                  value={totalEkuitas}
                  accent
                />
              </div>

              <TotalRow
                label="TOTAL KEWAJIBAN + EKUITAS"
                value={totalKewajiban + totalEkuitas}
                accent
                strong
              />

              {Math.abs(
                totalAset - (totalKewajiban + totalEkuitas)
              ) > 1 && (
                <div className="text-sm text-destructive">
                  ⚠ Tidak balance:{" "}
                  {formatRp(
                    totalAset - (totalKewajiban + totalEkuitas)
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 🔥 SECTION FIXED
function Section({
  items,
  compact,
}: {
  items: Array<{
    id: string;
    kode_akun: string;
    nama_akun: string;
    saldo: number;
  }>;
  compact?: boolean;
}) {
  const isContra = (it: any) =>
    it.kode_akun.startsWith("1.1.04") ||
    /penyisihan|akumulasi/i.test(it.nama_akun);

  const total = items.reduce((s, it) => {
    return isContra(it) ? s - it.saldo : s + it.saldo;
  }, 0);

  return (
    <div>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.id} className="flex justify-between text-sm">
            <span>
              <span className="font-mono text-xs mr-2">
                {it.kode_akun}
              </span>
              {it.nama_akun}
            </span>

            <span className="font-mono">
              {isContra(it)
                ? `(${formatRp(it.saldo)})`
                : formatRp(it.saldo)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between font-semibold border-t mt-2 pt-2">
        <span>Total</span>
        <span className="font-mono">{formatRp(total)}</span>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  accent,
  strong,
}: {
  label: string;
  value: number;
  accent?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between border-t pt-2 ${
        accent ? "text-primary" : ""
      } ${strong ? "font-bold" : ""}`}
    >
      <span>{label}</span>
      <span className="font-mono">{formatRp(value)}</span>
    </div>
  );
}
