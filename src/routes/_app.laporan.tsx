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
import { useBusinessUnit as useBusinessUnitForReport } from "@/lib/business-unit-context";

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
  business_unit_id?: string | null;
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
  // Ambil unit aktif dari context global (di-import di bawah)
  const { currentUnitId, units } = useBusinessUnitForReport();

  // Tentukan mode laporan
  const reportMode = useMemo(() => {
    if (currentUnitId === "ALL") return "KONSOLIDASI";
    const currentUnit = units.find(u => u.id === currentUnitId);
    if (currentUnit?.kode === "PUSAT") return "PUSAT";
    return "UNIT";
  }, [currentUnitId, units]);

  const isContra = (acc: any) =>
    acc.kode_akun.startsWith("1.1.04") ||
    /penyisihan|akumulasi/i.test(acc.nama_akun);

  // Fungsi untuk menentukan apakah akun perlu dieliminasi berdasarkan mode laporan
  const shouldEliminateAccount = (kode: string, mode: string) => {
    // RK antar unit (selalu dieliminasi di semua mode karena sudah di-map)
    if (kode.startsWith("1.1.99.") || kode.startsWith("2.1.02.") || kode.startsWith("3.8.")) {
      return true; // Selalu eliminasi RK
    }

    // Modal unit internal (hanya tampil di mode UNIT)
    if (kode.startsWith("3.2.01.")) {
      return mode !== "UNIT";
    }

    // Investasi unit (hanya tampil di mode PUSAT)
    if (kode.startsWith("1.2.01.")) {
      return mode !== "PUSAT";
    }

    return false;
  };

  useEffect(() => {
    setLoading(true);
    (async () => {
      let lq: any = supabase
        .from("journal_lines")
        .select("account_id,debit,kredit,journals!inner(tanggal,status,business_unit_id)")
        .lte("journals.tanggal", to)
        .gte("journals.tanggal", from)
        .eq("journals.status", "posted");
      if (currentUnitId !== "ALL") lq = lq.eq("journals.business_unit_id", currentUnitId);

      const [{ data: a }, { data: l }] = await Promise.all([
        supabase.from("accounts").select("*").eq("is_header", false),
        lq,
      ]);

      // Filter akun berdasarkan mode laporan
      const filtered = ((a as Acc[]) ?? []).filter((acc) =>
        !shouldEliminateAccount(acc.kode_akun, reportMode)
      );
      setAccounts(filtered);
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
  }, [from, to, currentUnitId, reportMode]);

  const unitLabel = currentUnitId === "ALL"
    ? "Semua Unit (Konsolidasi)"
    : units.find((u) => u.id === currentUnitId)?.nama ?? "—";

  const saldoMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts) m.set(a.id, 0);

    // Hitung saldo normal untuk semua akun
    for (const ln of lines) {
      const acc = accounts.find((a) => a.id === ln.account_id);
      if (!acc) continue;

      const delta =
        acc.normal_balance === "DEBIT"
          ? ln.debit - ln.kredit
          : ln.kredit - ln.debit;

      m.set(ln.account_id, (m.get(ln.account_id) ?? 0) + delta);
    }

    // Hitung saldo untuk akun virtual
    if (reportMode === "UNIT") {
      const currentUnit = units.find(u => u.id === currentUnitId);
      if (currentUnit) {
        // Hitung total RK yang masuk ke unit ini
        const rkLines = lines.filter(ln => {
          const acc = accounts.find(a => a.id === ln.account_id);
          return acc && acc.kode_akun.startsWith("2.1.02.") && acc.business_unit_id === currentUnitId;
        });
        const totalRkIn = rkLines.reduce((sum, ln) => {
          const acc = accounts.find(a => a.id === ln.account_id);
          if (!acc) return sum;
          const delta = acc.normal_balance === "DEBIT"
            ? ln.debit - ln.kredit
            : ln.kredit - ln.debit;
          return sum + delta;
        }, 0);
        m.set("modal_unit_virtual", totalRkIn);
      }
    } else if (reportMode === "PUSAT") {
      // Hitung total RK ke unit lain sebagai investasi
      const rkLines = lines.filter(ln => {
        const acc = accounts.find(a => a.id === ln.account_id);
        return acc && acc.kode_akun.startsWith("2.1.02.");
      });
      const totalInvestasi = rkLines.reduce((sum, ln) => {
        const acc = accounts.find(a => a.id === ln.account_id);
        if (!acc) return sum;
        const delta = acc.normal_balance === "DEBIT"
          ? ln.debit - ln.kredit
          : ln.kredit - ln.debit;
        return sum + delta;
      }, 0);
      m.set("investasi_virtual", totalInvestasi);
    }

    return m;
  }, [accounts, lines, reportMode, currentUnitId, units]);

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

    // Tambahkan akun virtual untuk modal unit jika di mode UNIT
    if (reportMode === "UNIT") {
      const currentUnit = units.find(u => u.id === currentUnitId);
      if (currentUnit) {
        const modalSaldo = saldoMap.get("modal_unit_virtual") ?? 0;
        if (Math.abs(modalSaldo) >= 0.005) {
          g.EKUITAS.push({
            id: "modal_unit_virtual",
            kode_akun: "3.2.01.01",
            nama_akun: `Modal Unit ${currentUnit.nama}`,
            tipe_akun: "EKUITAS",
            normal_balance: "KREDIT",
            saldo: modalSaldo
          });
        }
      }
    }

    // Tambahkan akun virtual untuk investasi jika di mode PUSAT
    if (reportMode === "PUSAT") {
      const investasiSaldo = saldoMap.get("investasi_virtual") ?? 0;
      if (Math.abs(investasiSaldo) >= 0.005) {
        g.ASET.push({
          id: "investasi_virtual",
          kode_akun: "1.2.01.00",
          nama_akun: "Investasi ke Unit",
          tipe_akun: "ASET",
          normal_balance: "DEBIT",
          saldo: investasiSaldo
        });
      }
    }

    return g;
  }, [accounts, saldoMap, reportMode, currentUnitId, units]);

  const sum = (arr: any[]) => arr.reduce((s, x) => s + x.saldo, 0);

  const labaBersih =
    sum(grouped.PENDAPATAN) -
    sum(grouped.HPP) -
    sum(grouped.BEBAN) +
    sum(grouped.PENDAPATAN_LAIN) -
    sum(grouped.BEBAN_LAIN);

  const totalAset = grouped.ASET.reduce((s: number, a: any) => {
    return isContra(a) ? s - a.saldo : s + a.saldo;
  }, 0);

  const totalKewajiban = sum(grouped.KEWAJIBAN);
  const totalEkuitas = sum(grouped.EKUITAS) + labaBersih;

  if (loading) {
    return <Loader2 className="animate-spin mx-auto mt-10" />;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-center text-xl font-bold uppercase">
          SILAPOR-BERCAHAYA
        </h1>
        <p className="text-center text-sm">Laporan Keuangan</p>

        <div className="grid md:grid-cols-2 gap-3 mt-4 max-w-md mx-auto">
          <div>
            <Label>Dari</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Sampai</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      <Tabs defaultValue="lr">
        <TabsList>
          <TabsTrigger value="lr">Laba Rugi</TabsTrigger>
          <TabsTrigger value="neraca">Neraca</TabsTrigger>
          <TabsTrigger value="ekuitas">Ekuitas</TabsTrigger>
          <TabsTrigger value="arus">Arus Kas</TabsTrigger>
        </TabsList>

        {/* LABA RUGI */}
        <TabsContent value="lr">
          <ReportTable title="LAPORAN LABA RUGI">
            <Rows items={grouped.PENDAPATAN} />
            <Total label="Total Pendapatan" value={sum(grouped.PENDAPATAN)} />

            <Rows items={grouped.HPP} />
            <Total label="Laba Kotor" value={sum(grouped.PENDAPATAN) - sum(grouped.HPP)} />

            <Rows items={grouped.BEBAN} />
            <Total label="LABA BERSIH" value={labaBersih} bold />
          </ReportTable>
        </TabsContent>

        {/* NERACA */}
        <TabsContent value="neraca">
          <ReportTable title="NERACA">
            <SectionTitle text="ASET" />
            <Rows items={grouped.ASET} />
            <Total label="Total Aset" value={totalAset} />

            <SectionTitle text="KEWAJIBAN" />
            <Rows items={grouped.KEWAJIBAN} />

            <SectionTitle text="EKUITAS" />
            <Rows items={grouped.EKUITAS} />
            <Row label="Laba Berjalan" value={labaBersih} />

            <Total
              label="TOTAL KEWAJIBAN + EKUITAS"
              value={totalKewajiban + totalEkuitas}
              bold
            />
          </ReportTable>
        </TabsContent>

        {/* EKUITAS */}
        <TabsContent value="ekuitas">
          <ReportTable title="PERUBAHAN EKUITAS">
            <Row label="Modal Awal" value={sum(grouped.EKUITAS)} />
            <Row label="Laba Bersih" value={labaBersih} />
            <Total label="Saldo Akhir" value={totalEkuitas} bold />
          </ReportTable>
        </TabsContent>

        {/* ARUS KAS */}
        <TabsContent value="arus">
          <ReportTable title="ARUS KAS (METODE TIDAK LANGSUNG)">
            <Row label="Laba Bersih" value={labaBersih} />
            <Row label="Penyesuaian Non Kas" value={sum(grouped.ASET)} />
            <Total label="Arus Kas Operasi" value={labaBersih} bold />
          </ReportTable>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* 🔥 UI COMPONENT */

function ReportTable({ title, children }: any) {
  return (
    <Card className="p-6 font-serif">
      <h2 className="text-center font-bold mb-4">{title}</h2>
      <table className="w-full border border-black text-sm">
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

function SectionTitle({ text }: any) {
  return (
    <tr className="border-t">
      <td colSpan={2} className="font-bold pt-3">{text}</td>
    </tr>
  );
}

function Rows({ items }: any) {
  return items.map((it: any) => (
    <Row key={it.id} label={it.nama_akun} value={it.saldo} />
  ));
}

function Row({ label, value }: any) {
  return (
    <tr>
      <td className="pl-4">{label}</td>
      <td className="text-right pr-4">
        {value < 0 ? `(${formatRp(Math.abs(value))})` : formatRp(value)}
      </td>
    </tr>
  );
}

function Total({ label, value, bold }: any) {
  return (
    <tr className={`border-t ${bold ? "font-bold" : ""}`}>
      <td>{label}</td>
      <td className="text-right">
        {value < 0 ? `(${formatRp(Math.abs(value))})` : formatRp(value)}
      </td>
    </tr>
  );
}
