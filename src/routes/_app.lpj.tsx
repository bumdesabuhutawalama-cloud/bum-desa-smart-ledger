import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatRp, todayISO } from "@/lib/format";
import { Loader2, Copy, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

type Jenis = "Operasi" | "Investasi" | "Pendanaan";

type Rincian = {
  journal_id: string;
  nomor_jurnal: string;
  tanggal: string;
  keterangan: string;
  nilai: number;
  jenis: Jenis;
  is_correction: boolean;
  arah: "MASUK" | "KELUAR" | "NETRAL";
};

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

    // === Rincian transaksi per jurnal ===
    type JAgg = {
      nomor_jurnal: string;
      tanggal: string;
      keterangan: string;
      totalDebit: number;
      totalKredit: number;
      hasInvest: boolean;
      hasFinance: boolean;
      hasPendapatan: boolean;
      hasBeban: boolean;
      hasKas: boolean; // 1.1.01 / 1.1.02
      kasDelta: number; // debit-kredit pada akun kas
      is_correction: boolean;
    };

    const jurnalMap = new Map<string, JAgg>();

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
          hasPendapatan: false,
          hasBeban: false,
          hasKas: false,
          kasDelta: 0,
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
      if (acc.tipe_akun === "PENDAPATAN" || acc.tipe_akun === "PENDAPATAN_LAIN") {
        j.hasPendapatan = true;
      }
      if (
        acc.tipe_akun === "BEBAN" ||
        acc.tipe_akun === "BEBAN_LAIN" ||
        acc.tipe_akun === "HPP"
      ) {
        j.hasBeban = true;
      }
      // deteksi kas/bank: kode 1.1.01 (kas) atau 1.1.02 (bank)
      if (
        acc.tipe_akun === "ASET" &&
        (acc.kode_akun.startsWith("1.1.01") || acc.kode_akun.startsWith("1.1.02"))
      ) {
        j.hasKas = true;
        j.kasDelta += ln.debit - ln.kredit;
      }
    }

    const rincian: Rincian[] = Array.from(jurnalMap.entries())
      .map(([journal_id, j]) => {
        const jenis: Jenis = j.hasInvest
          ? "Investasi"
          : j.hasFinance
            ? "Pendanaan"
            : "Operasi";
        let arah: "MASUK" | "KELUAR" | "NETRAL" = "NETRAL";
        if (j.hasKas) {
          arah = j.kasDelta > 0 ? "MASUK" : j.kasDelta < 0 ? "KELUAR" : "NETRAL";
        } else if (jenis === "Operasi") {
          if (j.hasPendapatan && !j.hasBeban) arah = "MASUK";
          else if (j.hasBeban && !j.hasPendapatan) arah = "KELUAR";
        }
        return {
          journal_id,
          nomor_jurnal: j.nomor_jurnal,
          tanggal: j.tanggal,
          keterangan: j.keterangan,
          nilai: Math.max(j.totalDebit, j.totalKredit),
          jenis,
          is_correction: j.is_correction,
          arah,
        };
      })
      .sort((a, b) => {
        if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
        return a.nomor_jurnal.localeCompare(b.nomor_jurnal);
      });

    const operasi = rincian.filter((r) => r.jenis === "Operasi");
    const investasi = rincian.filter((r) => r.jenis === "Investasi");
    const pendanaan = rincian.filter((r) => r.jenis === "Pendanaan");

    return {
      pendapatan,
      beban,
      hpp,
      operasiMasuk: pendapatan,
      operasiKeluar: beban + hpp,
      totalInvestasi: investasiNaik - investasiTurun,
      totalPendanaan: pendanaanNaik - pendanaanTurun,
      investasiAkun: Array.from(investasiAkun.entries()).filter(
        ([, v]) => Math.abs(v) > 0.5
      ),
      pendanaanAkun: Array.from(pendanaanAkun.entries()).filter(
        ([, v]) => Math.abs(v) > 0.5
      ),
      totalAset,
      totalEkuitas,
      labaBersih,
      adaData: lines.length > 0,
      rincian,
      operasi,
      investasi,
      pendanaan,
    };
  }, [accounts, lines]);

  const narasi = useMemo(() => {
    if (!data.adaData) {
      return null;
    }

    // Narasi operasi rinci per transaksi
    const buildRincianText = (items: Rincian[], emptyMsg: string) => {
      if (items.length === 0) return emptyMsg;
      const parts = items.map((r, i) => {
        const arahTeks =
          r.arah === "MASUK"
            ? "menerima"
            : r.arah === "KELUAR"
              ? "mengeluarkan"
              : "mencatat";
        return `(${i + 1}) pada ${fmtTglShort(r.tanggal)} ${arahTeks} ${formatRp(r.nilai)} untuk "${r.keterangan}" (No. ${r.nomor_jurnal})${r.is_correction ? " [koreksi]" : ""}`;
      });
      return parts.join("; ") + ".";
    };

    const operasiIntro = `Selama periode ini, BUMDes melaksanakan ${data.operasi.length} transaksi operasional dengan total penerimaan ${formatRp(data.operasiMasuk)} dan total pengeluaran ${formatRp(data.operasiKeluar)}, menghasilkan laba bersih ${formatRp(data.labaBersih)}.`;
    const operasiRinci =
      data.operasi.length > 0
        ? `Rincian aktivitas operasional: ${buildRincianText(data.operasi, "")}`
        : "Tidak terdapat aktivitas operasional pada periode ini.";

    const investasiIntro =
      data.investasi.length > 0
        ? `Pada sisi investasi, BUMDes melakukan ${data.investasi.length} transaksi dengan total nilai ${formatRp(Math.abs(data.totalInvestasi))}${
            data.investasiAkun.length > 0
              ? ` pada ${data.investasiAkun.map(([n]) => n.toLowerCase()).join(", ")}`
              : ""
          }.`
        : "Tidak terdapat aktivitas investasi pada periode ini.";
    const investasiRinci =
      data.investasi.length > 0
        ? `Rincian aktivitas investasi: ${buildRincianText(data.investasi, "")}`
        : "";

    const pendanaanIntro =
      data.pendanaan.length > 0
        ? `Dari sisi pendanaan, terdapat ${data.pendanaan.length} transaksi dengan total nilai ${formatRp(Math.abs(data.totalPendanaan))}${
            data.pendanaanAkun.length > 0
              ? ` pada ${data.pendanaanAkun.map(([n]) => n.toLowerCase()).join(", ")}`
              : ""
          }.`
        : "Tidak terdapat aktivitas pendanaan pada periode ini.";
    const pendanaanRinci =
      data.pendanaan.length > 0
        ? `Rincian aktivitas pendanaan: ${buildRincianText(data.pendanaan, "")}`
        : "";

    return {
      pembuka: `Pada periode ${fmtTgl(from)} sampai dengan ${fmtTgl(to)}, BUMDes telah melaksanakan berbagai kegiatan operasional, investasi, dan pendanaan sebagai bagian dari pelaksanaan program kerja, dengan total ${data.rincian.length} transaksi tercatat.`,
      operasi: operasiIntro,
      operasiRinci,
      investasi: investasiIntro,
      investasiRinci,
      pendanaan: pendanaanIntro,
      pendanaanRinci,
      ringkasan: `Secara keseluruhan, total aset BUMDes tercatat sebesar ${formatRp(data.totalAset)} dengan total ekuitas ${formatRp(data.totalEkuitas)} serta laba bersih periode berjalan ${formatRp(data.labaBersih)}.`,
      catatan: `Catatan: Seluruh nilai dalam laporan ini dinyatakan dalam Rupiah (Rp). Klasifikasi aktivitas mengikuti standar akuntansi: Operasi (pendapatan & beban operasional), Investasi (perolehan/pelepasan aset tetap), dan Pendanaan (perubahan utang & ekuitas). Transaksi bertanda [Koreksi] merupakan jurnal koreksi atas transaksi sebelumnya dan tetap diperhitungkan dalam saldo akhir.`,
      penutup: `Demikian Laporan Pertanggungjawaban ini disusun sebagai bentuk akuntabilitas pengelolaan keuangan BUMDes. Seluruh kegiatan telah dilaksanakan dan dicatat sesuai prinsip akuntansi yang berlaku umum (double-entry accrual basis).`,
    };
  }, [data, from, to]);

  const copy = async () => {
    if (!narasi) {
      await navigator.clipboard.writeText("Tidak terdapat data transaksi pada periode ini.");
    } else {
      const teks = [
        `LAPORAN PERTANGGUNGJAWABAN BUM DESA`,
        `Periode ${fmtTgl(from)} s.d. ${fmtTgl(to)}`,
        ``,
        narasi.pembuka,
        ``,
        `I. KEGIATAN OPERASIONAL`,
        narasi.operasi,
        narasi.operasiRinci,
        ``,
        `II. KEGIATAN INVESTASI`,
        narasi.investasi,
        narasi.investasiRinci,
        ``,
        `III. KEGIATAN PENDANAAN`,
        narasi.pendanaan,
        narasi.pendanaanRinci,
        ``,
        `IV. RINGKASAN POSISI KEUANGAN`,
        narasi.ringkasan,
        ``,
        `Ringkasan Aktivitas Keuangan:`,
        `- Operasi Masuk   : ${fmt(data.operasiMasuk)}`,
        `- Operasi Keluar  : ${fmt(data.operasiKeluar)}`,
        `- Investasi       : ${fmt(data.totalInvestasi)}`,
        `- Pendanaan       : ${fmt(data.totalPendanaan)}`,
        ``,
        `CATATAN`,
        narasi.catatan,
        ``,
        `PENUTUP`,
        narasi.penutup,
      ].join("\n");
      await navigator.clipboard.writeText(teks);
    }
    toast.success("Narasi LPJ disalin ke clipboard");
  };

  const cetak = () => window.print();

  const exportPDF = () => {
    if (!narasi) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const addParagraph = (text: string, opts?: { bold?: boolean; size?: number; align?: "left" | "center" | "justify" }) => {
      const size = opts?.size ?? 10;
      doc.setFont("times", opts?.bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, contentW);
      for (const line of lines) {
        if (y > 280) {
          doc.addPage();
          y = margin;
        }
        if (opts?.align === "center") {
          doc.text(line, pageW / 2, y, { align: "center" });
        } else {
          doc.text(line, margin, y);
        }
        y += size * 0.45;
      }
      y += 2;
    };

    const addHeading = (text: string) => {
      if (y > 270) { doc.addPage(); y = margin; }
      y += 2;
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text(text.toUpperCase(), margin, y);
      doc.setLineWidth(0.3);
      doc.line(margin, y + 1, pageW - margin, y + 1);
      y += 6;
    };

    // Header
    addParagraph("LAPORAN PERTANGGUNGJAWABAN", { bold: true, size: 14, align: "center" });
    addParagraph("Badan Usaha Milik Desa (BUM Desa)", { bold: true, size: 11, align: "center" });
    addParagraph(`Periode ${fmtTgl(from)} s.d. ${fmtTgl(to)}`, { size: 10, align: "center" });
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    addParagraph(narasi.pembuka);

    addHeading("I. Kegiatan Operasional");
    addParagraph(narasi.operasi);
    if (narasi.operasiRinci) addParagraph(narasi.operasiRinci);

    addHeading("II. Kegiatan Investasi");
    addParagraph(narasi.investasi);
    if (narasi.investasiRinci) addParagraph(narasi.investasiRinci);

    addHeading("III. Kegiatan Pendanaan");
    addParagraph(narasi.pendanaan);
    if (narasi.pendanaanRinci) addParagraph(narasi.pendanaanRinci);

    addHeading("IV. Ringkasan Posisi Keuangan");
    addParagraph(narasi.ringkasan);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Ringkasan Aktivitas Keuangan", "Nilai (Rp)"]],
      body: [
        ["Operasi Masuk", fmt(data.operasiMasuk)],
        ["Operasi Keluar", fmt(data.operasiKeluar)],
        ["Investasi", fmt(data.totalInvestasi)],
        ["Pendanaan", fmt(data.totalPendanaan)],
        [{ content: "Laba Bersih Periode", styles: { fontStyle: "bold" } }, { content: fmt(data.labaBersih), styles: { fontStyle: "bold" } }],
      ],
      theme: "grid",
      styles: { font: "times", fontSize: 10 },
      headStyles: { fillColor: [230, 230, 230], textColor: 20 },
      columnStyles: { 1: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    addHeading("V. Rincian Transaksi Keuangan");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["No", "Nomor Jurnal", "Tanggal", "Keterangan", "Nilai (Rp)", "Jenis"]],
      body: data.rincian.map((r, i) => [
        i + 1,
        r.nomor_jurnal,
        fmtTglShort(r.tanggal),
        r.keterangan + (r.is_correction ? "  [Koreksi]" : ""),
        fmt(r.nilai),
        r.jenis,
      ]),
      foot: [[
        { content: "Total", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
        { content: fmt(data.rincian.reduce((s, r) => s + r.nilai, 0)), styles: { halign: "right", fontStyle: "bold" } },
        "",
      ]],
      theme: "grid",
      styles: { font: "times", fontSize: 9, cellPadding: 1.5 },
      headStyles: { fillColor: [230, 230, 230], textColor: 20 },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 32 },
        2: { cellWidth: 22 },
        4: { halign: "right", cellWidth: 28 },
        5: { halign: "center", cellWidth: 22 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    addHeading("VI. Catatan Tambahan");
    addParagraph(narasi.catatan);

    addHeading("VII. Penutup");
    addParagraph(narasi.penutup);

    // Tanda tangan
    y += 10;
    if (y > 240) { doc.addPage(); y = margin; }
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    const colW = contentW / 2;
    doc.text("Mengetahui,", margin + colW * 0.25, y);
    doc.text("Disusun oleh,", margin + colW + colW * 0.25, y);
    y += 5;
    doc.setFont("times", "bold");
    doc.text("Kepala Desa", margin + colW * 0.25, y);
    doc.text("Direktur BUM Desa", margin + colW + colW * 0.25, y);
    y += 25;
    doc.setFont("times", "normal");
    doc.text("(....................................)", margin + colW * 0.25, y);
    doc.text("(....................................)", margin + colW + colW * 0.25, y);

    // Footer halaman
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("times", "italic");
      doc.setFontSize(8);
      doc.text(
        `LPJ BUM Desa — Halaman ${i} dari ${totalPages}`,
        pageW / 2,
        290,
        { align: "center" }
      );
    }

    doc.save(`LPJ_BUMDes_${from}_sd_${to}.pdf`);
    toast.success("PDF berhasil diunduh");
  };

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
        <div className="grid md:grid-cols-4 gap-3 mt-4">
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
            <Button onClick={cetak} variant="outline" className="flex-1">
              <Printer className="h-4 w-4" /> Cetak
            </Button>
          </div>
          <div className="flex items-end">
            <Button onClick={exportPDF} className="w-full">
              <FileDown className="h-4 w-4" /> Export PDF
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

        {!narasi ? (
          <p className="text-sm text-center italic">
            Tidak terdapat data transaksi pada periode ini.
          </p>
        ) : (
          <div className="space-y-6 text-sm text-justify">
            <section>
              <p className="indent-8">{narasi.pembuka}</p>
            </section>

            {/* I. Operasional */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                I. Kegiatan Operasional
              </h3>
              <p className="indent-8 mb-2">{narasi.operasi}</p>
              <p className="indent-8">{narasi.operasiRinci}</p>
            </section>

            {/* II. Investasi */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                II. Kegiatan Investasi
              </h3>
              <p className="indent-8 mb-2">{narasi.investasi}</p>
              {narasi.investasiRinci && (
                <p className="indent-8">{narasi.investasiRinci}</p>
              )}
            </section>

            {/* III. Pendanaan */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                III. Kegiatan Pendanaan
              </h3>
              <p className="indent-8 mb-2">{narasi.pendanaan}</p>
              {narasi.pendanaanRinci && (
                <p className="indent-8">{narasi.pendanaanRinci}</p>
              )}
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

            {/* VI. Catatan Tambahan */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                VI. Catatan Tambahan
              </h3>
              <p className="indent-8">{narasi.catatan}</p>
            </section>

            {/* VII. Penutup */}
            <section>
              <h3 className="font-bold uppercase border-b border-foreground/40 mb-2 pb-1">
                VII. Penutup
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
