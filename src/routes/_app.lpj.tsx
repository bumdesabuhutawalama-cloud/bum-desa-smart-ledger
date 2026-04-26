import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatRp, todayISO } from "@/lib/format";
import { Loader2, Copy, Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/lpj")({ component: LPJ });

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

const fmt = (n: number) =>
  n < 0 ? `(${formatRp(Math.abs(n))})` : formatRp(n);

const fmtTgl = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function LPJ() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(todayISO());
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: a }, { data: l }] = await Promise.all([
        supabase.from("accounts").select("*").eq("is_header", false),
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

  const data = useMemo(() => {
    const accMap = new Map(accounts.map((a) => [a.id, a]));

    let pendapatan = 0;
    let beban = 0;
    let hpp = 0;
    let investasiNaik = 0;
    let investasiTurun = 0;
    let pendanaanNaik = 0;
    let pendanaanTurun = 0;

    const investasiAkun = new Map<string, number>();
    const pendanaanAkun = new Map<string, number>();

    for (const ln of lines) {
      const acc = accMap.get(ln.account_id);
      if (!acc) continue;

      // OPERASI
      if (acc.tipe_akun === "PENDAPATAN" || acc.tipe_akun === "PENDAPATAN_LAIN") {
        pendapatan += ln.kredit - ln.debit;
      } else if (acc.tipe_akun === "BEBAN" || acc.tipe_akun === "BEBAN_LAIN") {
        beban += ln.debit - ln.kredit;
      } else if (acc.tipe_akun === "HPP") {
        hpp += ln.debit - ln.kredit;
      }

      // INVESTASI: Aset Tetap (kode 1.3)
      if (acc.tipe_akun === "ASET" && acc.kode_akun.startsWith("1.3")) {
        const delta = ln.debit - ln.kredit;
        if (delta > 0) investasiNaik += delta;
        else investasiTurun += Math.abs(delta);
        investasiAkun.set(
          acc.nama_akun,
          (investasiAkun.get(acc.nama_akun) ?? 0) + delta
        );
      }

      // PENDANAAN: Ekuitas + Kewajiban
      if (acc.tipe_akun === "EKUITAS" || acc.tipe_akun === "KEWAJIBAN") {
        const delta = ln.kredit - ln.debit;
        if (delta > 0) pendanaanNaik += delta;
        else pendanaanTurun += Math.abs(delta);
        pendanaanAkun.set(
          acc.nama_akun,
          (pendanaanAkun.get(acc.nama_akun) ?? 0) + delta
        );
      }
    }

    const labaBersih = pendapatan - beban - hpp;

    // Total Aset & Ekuitas (saldo akhir periode)
    let totalAset = 0;
    let totalEkuitas = 0;
    const saldo = new Map<string, number>();
    for (const ln of lines) {
      const acc = accMap.get(ln.account_id);
      if (!acc) continue;
      const delta =
        acc.normal_balance === "DEBIT"
          ? ln.debit - ln.kredit
          : ln.kredit - ln.debit;
      saldo.set(acc.id, (saldo.get(acc.id) ?? 0) + delta);
    }
    for (const a of accounts) {
      const s = saldo.get(a.id) ?? 0;
      const isContra =
        a.kode_akun.startsWith("1.1.04") ||
        /penyisihan|akumulasi/i.test(a.nama_akun);
      if (a.tipe_akun === "ASET") totalAset += isContra ? -s : s;
      if (a.tipe_akun === "EKUITAS") totalEkuitas += s;
    }
    totalEkuitas += labaBersih;

    const deskripsiAset = Array.from(investasiAkun.entries())
      .filter(([, v]) => Math.abs(v) > 0.5)
      .map(([n]) => n.toLowerCase())
      .join(", ");

    const deskripsiPendanaan = Array.from(pendanaanAkun.entries())
      .filter(([, v]) => Math.abs(v) > 0.5)
      .map(([n]) => n.toLowerCase())
      .join(", ");

    return {
      pendapatan,
      beban,
      hpp,
      operasiMasuk: pendapatan,
      operasiKeluar: beban + hpp,
      totalInvestasi: investasiNaik - investasiTurun,
      totalPendanaan: pendanaanNaik - pendanaanTurun,
      deskripsiAset,
      deskripsiPendanaan,
      totalAset,
      totalEkuitas,
      labaBersih,
      adaData: lines.length > 0,
    };
  }, [accounts, lines]);

  const narasi = useMemo(() => {
    if (!data.adaData) {
      return "Tidak terdapat data transaksi pada periode ini.";
    }

    const investasiTeks =
      Math.abs(data.totalInvestasi) > 0.5 && data.deskripsiAset
        ? `Dalam rangka pengembangan usaha, BUMDes melakukan kegiatan investasi berupa ${data.deskripsiAset} dengan total nilai sebesar ${fmt(data.totalInvestasi)}.`
        : "Pada periode ini tidak terdapat aktivitas investasi yang signifikan.";

    const pendanaanTeks =
      Math.abs(data.totalPendanaan) > 0.5 && data.deskripsiPendanaan
        ? `Dari sisi pendanaan, terdapat aktivitas pada ${data.deskripsiPendanaan} dengan total nilai sebesar ${fmt(data.totalPendanaan)}.`
        : "Pada periode ini tidak terdapat aktivitas pendanaan yang signifikan.";

    return [
      `Pada periode ${fmtTgl(from)} sampai dengan ${fmtTgl(to)}, BUMDes telah melaksanakan berbagai kegiatan operasional, investasi, dan pendanaan sebagai bagian dari pelaksanaan program kerja.`,
      ``,
      `KEGIATAN OPERASIONAL`,
      `Selama periode tersebut, kegiatan operasional menghasilkan penerimaan sebesar ${fmt(data.operasiMasuk)} dan pengeluaran sebesar ${fmt(data.operasiKeluar)}. Selisih dari kegiatan operasional ini menghasilkan laba bersih sebesar ${fmt(data.labaBersih)}.`,
      ``,
      `KEGIATAN INVESTASI`,
      investasiTeks,
      ``,
      `KEGIATAN PENDANAAN`,
      pendanaanTeks,
      ``,
      `RINGKASAN POSISI KEUANGAN`,
      `Secara keseluruhan, total aset BUMDes tercatat sebesar ${fmt(data.totalAset)} dengan total ekuitas sebesar ${fmt(data.totalEkuitas)} serta laba bersih periode berjalan sebesar ${fmt(data.labaBersih)}.`,
      ``,
      `PENUTUP`,
      `Demikian Laporan Pertanggungjawaban ini disusun sebagai bentuk akuntabilitas pengelolaan keuangan BUMDes. Seluruh kegiatan telah dilaksanakan dan dicatat sesuai dengan prinsip akuntansi yang berlaku umum.`,
    ].join("\n");
  }, [data, from, to]);

  const copy = async () => {
    await navigator.clipboard.writeText(narasi);
    toast.success("Narasi LPJ disalin ke clipboard");
  };

  const cetak = () => window.print();

  if (loading) {
    return <Loader2 className="animate-spin mx-auto mt-10" />;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 print:hidden">
        <h1 className="text-xl font-bold">Generate LPJ</h1>
        <p className="text-sm text-muted-foreground">
          Laporan Pertanggungjawaban otomatis berdasarkan data jurnal posted.
        </p>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <div>
            <Label>Dari</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Sampai</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={copy} variant="outline" className="flex-1">
              <Copy className="h-4 w-4" /> Salin
            </Button>
            <Button onClick={cetak} className="flex-1">
              <Printer className="h-4 w-4" /> Cetak
            </Button>
          </div>
        </div>
      </Card>

      {/* Ringkasan angka */}
      <div className="grid md:grid-cols-4 gap-3 print:hidden">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Operasi Masuk</div>
          <div className="font-semibold">{fmt(data.operasiMasuk)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Operasi Keluar</div>
          <div className="font-semibold">{fmt(data.operasiKeluar)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Investasi</div>
          <div className="font-semibold">{fmt(data.totalInvestasi)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pendanaan</div>
          <div className="font-semibold">{fmt(data.totalPendanaan)}</div>
        </Card>
      </div>

      {/* Narasi */}
      <Card className="p-8 font-serif leading-relaxed">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold uppercase">
            Laporan Pertanggungjawaban
          </h2>
          <p className="text-sm">BUM Desa</p>
          <p className="text-sm">
            Periode {fmtTgl(from)} s.d. {fmtTgl(to)}
          </p>
        </div>
        <div className="whitespace-pre-line text-justify text-sm">
          {narasi}
        </div>
      </Card>
    </div>
  );
}
