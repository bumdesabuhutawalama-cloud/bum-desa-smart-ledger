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

  const isContra = (acc: any) =>
    acc.kode_akun.startsWith("1.1.04") ||
    /penyisihan|akumulasi/i.test(acc.nama_akun);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: a }, { data: l }] = await Promise.all([
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
    const g: any = {
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

    return g;
  }, [accounts, saldoMap]);

  const sum = (arr: any[]) => arr.reduce((s, x) => s + x.saldo, 0);

  // 🔥 LABA
  const labaBersih =
    sum(grouped.PENDAPATAN) -
    sum(grouped.HPP) -
    sum(grouped.BEBAN) +
    sum(grouped.PENDAPATAN_LAIN) -
    sum(grouped.BEBAN_LAIN);

  const totalAset = grouped.ASET.reduce((s: number, a: any) => {
    return isContra(a) ? s - a.saldo : s + a.saldo;
  }, 0);

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

      <Tabs defaultValue="arus">
        <TabsList>
          <TabsTrigger value="arus">Arus Kas</TabsTrigger>
        </TabsList>

        <TabsContent value="arus">
          <ArusKas
            grouped={grouped}
            labaBersih={labaBersih}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 🔥 ARUS KAS METODE TIDAK LANGSUNG
function ArusKas({ grouped, labaBersih }: any) {
  const sum = (arr: any[]) => arr.reduce((s, x) => s + x.saldo, 0);

  // 🔥 NON CASH (penyisihan, depresiasi)
  const nonKas = grouped.ASET
    .filter((a: any) => /penyisihan|akumulasi/i.test(a.nama_akun))
    .reduce((s: number, a: any) => s + Math.abs(a.saldo), 0);

  // 🔥 PERUBAHAN PIUTANG
  const piutang = sum(
    grouped.ASET.filter((a: any) => /piutang/i.test(a.nama_akun))
  );

  // 🔥 PERUBAHAN UTANG
  const utang = sum(grouped.KEWAJIBAN);

  const arusOperasi =
    labaBersih +
    nonKas -
    piutang +
    utang;

  return (
    <div className="bg-[#f5e6c8] p-6 text-sm font-serif">
      <h2 className="text-center font-bold text-lg">
        LAPORAN ARUS KAS (METODE TIDAK LANGSUNG)
      </h2>

      <table className="w-full mt-4 border border-black">
        <tbody>
          <tr>
            <td>Laba Bersih</td>
            <td className="text-right">{formatRp(labaBersih)}</td>
          </tr>

          <tr>
            <td>Penyesuaian Non Kas</td>
            <td className="text-right">{formatRp(nonKas)}</td>
          </tr>

          <tr>
            <td>Perubahan Piutang</td>
            <td className="text-right">({formatRp(piutang)})</td>
          </tr>

          <tr>
            <td>Perubahan Utang</td>
            <td className="text-right">{formatRp(utang)}</td>
          </tr>

          <tr className="border-t font-bold">
            <td>Arus Kas dari Operasi</td>
            <td className="text-right">{formatRp(arusOperasi)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
