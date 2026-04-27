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
  journal_id: string;
  nomor_jurnal: string;
  keterangan: string;
  is_correction: boolean;
};

const fmt = (n: number) =>
  n < 0 ? `(${formatRp(Math.abs(n))})` : formatRp(n);

const fmtTgl = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fmtTglShort = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
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
          .select(
            "account_id,debit,kredit,journal_id,journals!inner(tanggal,status,nomor_jurnal,keterangan,is_correction)"
          )
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
          journal_id: x.journal_id,
          nomor_jurnal: x.journals.nomor_jurnal,
          keterangan: x.journals.keterangan,
          is_correction: !!x.journals.is_correction,
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

      if (acc.tipe_akun === "PENDAPATAN" || acc.tipe_akun === "PENDAPATAN_LAIN") {
        pendapatan += ln.kredit - ln.debit;
      } else if (acc.tipe_akun === "BEBAN" || acc.tipe_akun === "BEBAN_LAIN") {
        beban += ln.debit - ln.kredit;
      } else if (acc.tipe_akun === "HPP") {
        hpp += ln.debit - ln.kredit;
      }

      if (acc.tipe_akun === "ASET" && acc.kode_akun.startsWith("1.3")) {
        const delta = ln.debit - ln.kredit;
        if (delta > 0) investasiNaik += delta;
        else investasiTurun += Math.abs(delta);
        investasiAkun.set(
          acc.nama_akun,
          (investasiAkun.get(acc.nama_akun) ?? 0) + delta
        );
      }

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

    // === Rincian transaksi per jurnal ===
    type Rincian = {
      journal_id: string;
      nomor_jurnal: string;
      tanggal: string;
      keterangan: string;
      nilai: number;
      jenis: "Operasi" | "Investasi" | "Pendanaan";
      is_correction: boolean;
    };

    const jurnalMap = new Map<
      string,
      {
        nomor_jurnal: string;
        tanggal: string;
        keterangan: string;
        totalDebit: number;
        totalKredit: number;
        hasInvest: boolean;
        hasFinance: boolean;
        is_correction: boolean;
      }
    >();

    for (const ln of lines) {
      const acc = accMap.get(ln.account_id);
      if (!acc) continue;
      let j = jurnalMap.get(ln.journal_id);
      if (!j) {
        j = {
          nomor_jurnal: ln.nomor_jurnal,
          tanggal: ln.tanggal,
          keterangan: ln.keterangan,
          totalDebit: 0,
          totalKredit: 0,
          hasInvest: false,
          hasFinance: false,
          is_correction: ln.is_correction,
        };
        jurnalMap.set(ln.journal_id, j);
      }
      j.totalDebit += ln.debit;
      j.totalKredit += ln.kredit;
      if (acc.tipe_akun === "ASET" && acc.kode_akun.startsWith("1.3")) {
        j.hasInvest = true;
      }
      if (acc.tipe_akun === "EKUITAS" || acc.tipe_akun === "KEWAJIBAN") {
        j.hasFinance = true;
      }
    }

    const rincian: Rincian[] = Array.from(jurnalMap.entries())
      .map(([journal_id, j]) => ({
        journal_id,
        nomor_jurnal: j.nomor_jurnal,
        tanggal: j.tanggal,
        keterangan: j.keterangan,
        nilai: Math.max(j.totalDebit, j.totalKredit),
        jenis: (j.hasInvest
          ? "Investasi"
          : j.hasFinance
            ? "Pendanaan"
            : "Operasi") as "Operasi" | "Investasi" | "Pendanaan",
        is_correction: j.is_correction,
      }))
      .sort((a, b) => {
        if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
        return a.nomor_jurnal.localeCompare(b.nomor_jurnal);
      });

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
      rincian,
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

    return {
      pembuka: `Pada periode ${fmtTgl(from)} sampai dengan ${fmtTgl(to)}, BUMDes telah melaksanakan berbagai kegiatan operasional, investasi, dan pendanaan sebagai bagian dari pelaksanaan program kerja.`,
      operasi: `Selama periode tersebut, kegiatan operasional menghasilkan penerimaan sebesar ${fmt(data.operasiMasuk)} dan pengeluaran sebesar ${fmt(data.operasiKeluar)}. Selisih dari kegiatan operasional ini menghasilkan laba bersih sebesar ${fmt(data.labaBersih)}.`,
      investasi: investasiTeks,
      pendanaan: pendanaanTeks,
      ringkasan: `Secara keseluruhan, total aset BUMDes tercatat sebesar ${fmt(data.totalAset)} dengan total ekuitas sebesar ${fmt(data.totalEkuitas)} serta laba bersih periode berjalan sebesar ${fmt(data.labaBersih)}.`,
      penutup: `Demikian Laporan Pertanggungjawaban ini disusun sebagai bentuk akuntabilitas pengelolaan keuangan BUMDes. Seluruh kegiatan telah dilaksanakan dan dicatat sesuai dengan prinsip akuntansi yang berlaku umum.`,
    };
  }, [data, from, to]);

  const copy = async () => {
    if (typeof narasi === "string") {
      await navigator.clipboard.writeText(narasi);
    } else {
      const teks = [
        `LAPORAN PERTANGGUNGJAWABAN BUM DESA`,
        `Periode ${fmtTgl(from)} s.d. ${fmtTgl(to)}`,
        ``,
        narasi.pembuka,
        ``,
        `KEGIATAN OPERASIONAL`,
        narasi.operasi,
        ``,
        `KEGIATAN INVESTASI`,
        narasi.investasi,
        ``,
        `KEGIATAN PENDANAAN`,
        narasi.pendanaan,
        ``,
        `RINGKASAN POSISI KEUANGAN`,
        narasi.ringkasan,
        ``,
        `Ringkasan Aktivitas Keuangan:`,
        `- Operasi Masuk   : ${fmt(data.operasiMasuk)}`,
        `- Operasi Keluar  : ${fmt(data.operasiKeluar)}`,
        `- Investasi       : ${fmt(data.totalInvestasi)}`,
        `- Pendanaan       : ${fmt(data.totalPendanaan)}`,
        ``,
        `PENUTUP`,
        narasi.penutup,
      ].join("\n");
      await navigator.clipboard.writeText(teks);
    }
    toast.success("Narasi LPJ disalin ke clipboard");
  };

  const cetak = () => window.print();

  if (loading) {
    return <Loader2 className="animate-spin mx-auto mt-10" />;
  }

  return (
    <div className="space-y-6">
      {/* Filter & aksi */}
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

      {/* Dokumen LPJ */}
      <Card className="p-10 font-serif leading-relaxed bg-card print:shadow-none print:border-0">
        {/* Kop / Judul */}
        <div className="text-center border-b-2 border-foreground pb-4 mb-6">
          <h2 className="text-xl font-bold uppercase tracking-wide">
            Laporan Pertanggungjawaban
          </h2>
          <p className="text-base font-semibold">Badan Usaha Milik Desa (BUM Desa)</p>
          <p className="text-sm mt-1">
            Periode {fmtTgl(from)} s.d. {fmtTgl(to)}
          </p>
        </div>

        {typeof narasi === "string" ? (
          <p className="text-sm text-center italic">{narasi}</p>
        ) : (
          <div className="space-y-6 text-sm text-justify">
            {/* Pembuka */}
            <section>
              <p className="indent-8">{narasi.pembuka}</p>
            </section>

            {/* I. Operasional */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                I. Kegiatan Operasional
              </h3>
              <p className="indent-8">{narasi.operasi}</p>
            </section>

            {/* II. Investasi */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                II. Kegiatan Investasi
              </h3>
              <p className="indent-8">{narasi.investasi}</p>
            </section>

            {/* III. Pendanaan */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                III. Kegiatan Pendanaan
              </h3>
              <p className="indent-8">{narasi.pendanaan}</p>
            </section>

            {/* IV. Ringkasan posisi keuangan */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                IV. Ringkasan Posisi Keuangan
              </h3>
              <p className="indent-8 mb-3">{narasi.ringkasan}</p>

              <div className="border border-foreground/60 rounded-sm p-4 bg-muted/30">
                <p className="font-semibold mb-2">Ringkasan Aktivitas Keuangan:</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 w-1/2">Operasi Masuk</td>
                      <td className="py-1 text-right font-mono">{fmt(data.operasiMasuk)}</td>
                    </tr>
                    <tr>
                      <td className="py-1">Operasi Keluar</td>
                      <td className="py-1 text-right font-mono">{fmt(data.operasiKeluar)}</td>
                    </tr>
                    <tr>
                      <td className="py-1">Investasi</td>
                      <td className="py-1 text-right font-mono">{fmt(data.totalInvestasi)}</td>
                    </tr>
                    <tr>
                      <td className="py-1">Pendanaan</td>
                      <td className="py-1 text-right font-mono">{fmt(data.totalPendanaan)}</td>
                    </tr>
                    <tr className="border-t border-foreground/40">
                      <td className="py-1 font-semibold">Laba Bersih Periode</td>
                      <td className="py-1 text-right font-mono font-semibold">
                        {fmt(data.labaBersih)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* V. Rincian Transaksi */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                V. Rincian Transaksi Keuangan
              </h3>
              {data.rincian.length === 0 ? (
                <p className="italic text-muted-foreground">
                  Tidak ada transaksi pada periode ini.
                </p>
              ) : (
                <table className="w-full text-xs border-collapse border border-foreground">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-foreground p-2 w-10 text-center">No</th>
                      <th className="border border-foreground p-2 text-left">Nomor Jurnal</th>
                      <th className="border border-foreground p-2 text-left w-24">Tanggal</th>
                      <th className="border border-foreground p-2 text-left">Keterangan</th>
                      <th className="border border-foreground p-2 text-right w-32">Nilai (Rp)</th>
                      <th className="border border-foreground p-2 text-center w-24">Jenis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rincian.map((r, i) => (
                      <tr key={r.journal_id}>
                        <td className="border border-foreground p-2 text-center">{i + 1}</td>
                        <td className="border border-foreground p-2 font-mono">
                          {r.nomor_jurnal}
                        </td>
                        <td className="border border-foreground p-2">
                          {fmtTglShort(r.tanggal)}
                        </td>
                        <td className="border border-foreground p-2">{r.keterangan}</td>
                        <td className="border border-foreground p-2 text-right font-mono">
                          {fmt(r.nilai)}
                        </td>
                        <td className="border border-foreground p-2 text-center">
                          {r.jenis}
                          {r.is_correction && (
                            <span className="ml-1 inline-block rounded bg-secondary px-1 py-0.5 text-[10px] font-semibold text-secondary-foreground border border-primary/40">
                              Koreksi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted font-semibold">
                      <td
                        colSpan={4}
                        className="border border-foreground p-2 text-right"
                      >
                        Total
                      </td>
                      <td className="border border-foreground p-2 text-right font-mono">
                        {fmt(data.rincian.reduce((s, r) => s + r.nilai, 0))}
                      </td>
                      <td className="border border-foreground p-2"></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </section>

            {/* VI. Penutup */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                VI. Penutup
              </h3>
              <p className="indent-8">{narasi.penutup}</p>
            </section>

            {/* Tanda tangan */}
            <section className="pt-10 grid grid-cols-2 gap-8 text-center text-sm">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold">Kepala Desa</p>
                <div className="h-20" />
                <p className="border-t border-foreground inline-block px-8 pt-1">
                  (....................................)
                </p>
              </div>
              <div>
                <p>Disusun oleh,</p>
                <p className="font-semibold">Direktur BUM Desa</p>
                <div className="h-20" />
                <p className="border-t border-foreground inline-block px-8 pt-1">
                  (....................................)
                </p>
              </div>
            </section>
          </div>
        )}
      </Card>
    </div>
  );
}
