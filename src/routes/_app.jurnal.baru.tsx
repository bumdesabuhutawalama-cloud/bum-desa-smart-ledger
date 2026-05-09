import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatRp, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus, ArrowLeft, Check, ChevronsUpDown, Loader2, Sparkles, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusinessUnit } from "@/lib/unit-context";

type Acc = {
  id: string;
  kode_akun: string;
  nama_akun: string;
  normal_balance: "DEBIT" | "KREDIT";
  is_header: boolean;
  tipe_akun:
    | "ASET"
    | "KEWAJIBAN"
    | "EKUITAS"
    | "PENDAPATAN"
    | "BEBAN"
    | "HPP"
    | "PENDAPATAN_LAIN"
    | "BEBAN_LAIN";
};
type Line = { account_id: string; debit: number; kredit: number; keterangan?: string };

export const Route = createFileRoute("/_app/jurnal/baru")({ component: JurnalBaru });

const emptyLine = (): Line => ({ account_id: "", debit: 0, kredit: 0 });

// === Auto-rule definitions ===
type TxnKind =
  | "belanja_aset"
  | "terima_pendapatan"
  | "bayar_beban"
  | "tambah_modal"
  | "bayar_utang"
  | "terima_piutang"
  | "ambil_utang"
  | "beri_piutang";

type TxnRule = {
  key: TxnKind;
  label: string;
  flow: "masuk" | "keluar"; // perspektif kas
  /** Sisi DEBIT diisi dari pilihan akun utama user (true) atau dari kas (false) */
  mainOnDebit: boolean;
  mainAccountTypes: Acc["tipe_akun"][];
  mainAccountLabel: string;
  description: string;
};

const TXN_RULES: TxnRule[] = [
  {
    key: "terima_pendapatan",
    label: "💰 Terima Pendapatan (Uang Masuk)",
    flow: "masuk",
    mainOnDebit: false,
    mainAccountTypes: ["PENDAPATAN", "PENDAPATAN_LAIN"],
    mainAccountLabel: "Akun Pendapatan",
    description: "Mis. penerimaan kas dari penjualan / jasa.",
  },
  {
    key: "terima_piutang",
    label: "📥 Terima Pembayaran Piutang (Uang Masuk)",
    flow: "masuk",
    mainOnDebit: false,
    mainAccountTypes: ["ASET"],
    mainAccountLabel: "Akun Piutang",
    description: "Pelanggan membayar piutangnya.",
  },
  {
    key: "tambah_modal",
    label: "🏦 Tambah Modal / Setoran Modal (Uang Masuk)",
    flow: "masuk",
    mainOnDebit: false,
    mainAccountTypes: ["EKUITAS"],
    mainAccountLabel: "Akun Modal / Ekuitas",
    description: "Pemilik / desa menyetor modal.",
  },
  {
    key: "ambil_utang",
    label: "📑 Terima Pinjaman / Utang (Uang Masuk)",
    flow: "masuk",
    mainOnDebit: false,
    mainAccountTypes: ["KEWAJIBAN"],
    mainAccountLabel: "Akun Utang / Kewajiban",
    description: "BUMDes menerima pinjaman dari bank / pihak lain.",
  },
  {
    key: "belanja_aset",
    label: "🏠 Belanja Aset (Uang Keluar)",
    flow: "keluar",
    mainOnDebit: true,
    mainAccountTypes: ["ASET"],
    mainAccountLabel: "Akun Aset",
    description: "Pembelian aset tetap / persediaan secara tunai.",
  },
  {
    key: "bayar_beban",
    label: "🧾 Bayar Beban / Biaya (Uang Keluar)",
    flow: "keluar",
    mainOnDebit: true,
    mainAccountTypes: ["BEBAN", "BEBAN_LAIN", "HPP"],
    mainAccountLabel: "Akun Beban",
    description: "Pembayaran biaya operasional, gaji, listrik, dll.",
  },
  {
    key: "bayar_utang",
    label: "💳 Bayar Utang (Uang Keluar)",
    flow: "keluar",
    mainOnDebit: true,
    mainAccountTypes: ["KEWAJIBAN"],
    mainAccountLabel: "Akun Utang",
    description: "Pelunasan utang ke pihak ketiga.",
  },
  {
    key: "beri_piutang",
    label: "📤 Beri Pinjaman / Piutang (Uang Keluar)",
    flow: "keluar",
    mainOnDebit: true,
    mainAccountTypes: ["ASET"],
    mainAccountLabel: "Akun Piutang",
    description: "BUMDes meminjamkan uang ke pihak lain.",
  },
];

const DEFAULT_KAS_NAME = "Kas di Bank BRI";

function JurnalBaru() {
  const nav = useNavigate();
  const { units, currentUnitId, defaultUnit } = useBusinessUnit();
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [loadingAcc, setLoadingAcc] = useState(true);
  const [tanggal, setTanggal] = useState(todayISO());
  const [keterangan, setKeterangan] = useState("");
  const [autoMode, setAutoMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessUnitId, setBusinessUnitId] = useState<string>(
    () => (currentUnitId !== "ALL" ? currentUnitId : defaultUnit?.id ?? ""),
  );
  useEffect(() => {
    if (currentUnitId !== "ALL") setBusinessUnitId(currentUnitId);
    else if (!businessUnitId && defaultUnit) setBusinessUnitId(defaultUnit.id);
  }, [currentUnitId, defaultUnit, businessUnitId]);

  // Manual mode state
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

  // Auto mode state
  const [txnKind, setTxnKind] = useState<TxnKind>("terima_pendapatan");
  const [mainAccountId, setMainAccountId] = useState("");
  const [kasAccountId, setKasAccountId] = useState("");
  const [nominal, setNominal] = useState(0);
  // Khusus terima_piutang: pisahkan pokok & bunga
  const [bunga, setBunga] = useState(0);
  const [pendapatanBungaId, setPendapatanBungaId] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id,kode_akun,nama_akun,normal_balance,is_header,tipe_akun")
        .eq("is_header", false)
        .eq("is_active", true)
        .eq("is_manual_input", true)
        .order("kode_akun");
      if (!mounted) return;
      if (error) toast.error("Gagal memuat akun: " + error.message);
      const accs = (data as Acc[]) ?? [];
      setAccounts(accs);
      // Set default kas: Kas di Bank BRI, kalau tidak ada pakai Kas Tunai
      const def =
        accs.find((a) => a.nama_akun === DEFAULT_KAS_NAME) ??
        accs.find((a) => /kas/i.test(a.nama_akun) && a.tipe_akun === "ASET");
      if (def) setKasAccountId(def.id);
      setLoadingAcc(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // === Akun kas/bank (untuk auto pairing) ===
  const kasAccounts = useMemo(
    () => accounts.filter((a) => a.tipe_akun === "ASET" && /kas|bank/i.test(a.nama_akun)),
    [accounts],
  );

  const currentRule = useMemo(() => TXN_RULES.find((r) => r.key === txnKind)!, [txnKind]);

  const mainAccountChoices = useMemo(() => {
    let pool = accounts.filter((a) => currentRule.mainAccountTypes.includes(a.tipe_akun));
    // Untuk piutang, sempitkan ke akun yang nama-nya mengandung "piutang"
    if (txnKind === "terima_piutang" || txnKind === "beri_piutang") {
      pool = pool.filter((a) => /piutang/i.test(a.nama_akun));
    }
    // Untuk belanja_aset, hindari akun kas/bank
    if (txnKind === "belanja_aset") {
      pool = pool.filter((a) => !/kas|bank/i.test(a.nama_akun));
    }
    return pool;
  }, [accounts, currentRule, txnKind]);

  // Reset main account ketika ganti jenis transaksi (bila tidak relevan)
  useEffect(() => {
    if (mainAccountId && !mainAccountChoices.some((a) => a.id === mainAccountId)) {
      setMainAccountId("");
    }
  }, [mainAccountChoices, mainAccountId]);

  // Daftar akun pendapatan (untuk bunga piutang)
  const pendapatanChoices = useMemo(
    () => accounts.filter((a) => a.tipe_akun === "PENDAPATAN" || a.tipe_akun === "PENDAPATAN_LAIN"),
    [accounts],
  );

  // === AUTO MODE: derive lines ===
  const autoLines = useMemo<Line[]>(() => {
    if (!mainAccountId || !kasAccountId || nominal <= 0) return [];
    // Khusus terima pembayaran piutang dengan bunga
    if (txnKind === "terima_piutang" && bunga > 0) {
      if (!pendapatanBungaId) return [];
      return [
        { account_id: kasAccountId, debit: nominal + bunga, kredit: 0 },
        { account_id: mainAccountId, debit: 0, kredit: nominal },
        { account_id: pendapatanBungaId, debit: 0, kredit: bunga, keterangan: "Pendapatan bunga" },
      ];
    }
    if (currentRule.mainOnDebit) {
      return [
        { account_id: mainAccountId, debit: nominal, kredit: 0 },
        { account_id: kasAccountId, debit: 0, kredit: nominal },
      ];
    }
    return [
      { account_id: kasAccountId, debit: nominal, kredit: 0 },
      { account_id: mainAccountId, debit: 0, kredit: nominal },
    ];
  }, [currentRule, mainAccountId, kasAccountId, nominal, txnKind, bunga, pendapatanBungaId]);

  // === MANUAL MODE helpers ===
  const totals = useMemo(() => {
    const ls = autoMode ? autoLines : lines;
    const d = ls.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const k = ls.reduce((s, l) => s + (Number(l.kredit) || 0), 0);
    return { d, k, balanced: Math.abs(d - k) < 0.005 && d > 0 };
  }, [lines, autoLines, autoMode]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const removeLine = (i: number) => {
    if (lines.length <= 2) {
      toast.warning("Minimal 2 baris jurnal");
      return;
    }
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  };

  const onAccountChange = (i: number, accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) {
      setLine(i, { account_id: accId });
      return;
    }
    const otherD = lines.reduce((s, l, idx) => s + (idx !== i ? Number(l.debit) || 0 : 0), 0);
    const otherK = lines.reduce((s, l, idx) => s + (idx !== i ? Number(l.kredit) || 0 : 0), 0);
    const diff = otherD - otherK;
    const cur = lines[i];
    const sudahAdaAngka = (cur.debit || 0) > 0 || (cur.kredit || 0) > 0;
    if (sudahAdaAngka) {
      setLine(i, { account_id: accId });
      return;
    }
    if (diff > 0) setLine(i, { account_id: accId, debit: 0, kredit: diff });
    else if (diff < 0) setLine(i, { account_id: accId, debit: Math.abs(diff), kredit: 0 });
    else setLine(i, { account_id: accId });
  };

  const setDebit = (i: number, val: string) => setLine(i, { debit: parseLocaleNumber(val), kredit: 0 });
  const setKredit = (i: number, val: string) => setLine(i, { kredit: parseLocaleNumber(val), debit: 0 });

  const submit = async () => {
    if (!tanggal) return toast.error("Tanggal wajib diisi");
    if (!keterangan.trim()) return toast.error("Keterangan wajib diisi");

    let valid: Line[] = [];
    if (autoMode) {
      if (!mainAccountId) return toast.error(`Pilih ${currentRule.mainAccountLabel} terlebih dahulu`);
      if (!kasAccountId) return toast.error("Pilih akun Kas/Bank");
      if (nominal <= 0) return toast.error("Nominal pokok harus lebih dari 0");
      if (txnKind === "terima_piutang" && bunga > 0 && !pendapatanBungaId) {
        return toast.error("Pilih akun Pendapatan Bunga karena bunga > 0");
      }
      valid = autoLines;
    } else {
      valid = lines.filter((l) => l.account_id && ((l.debit || 0) > 0 || (l.kredit || 0) > 0));
      if (valid.length < 2) return toast.error("Minimal 2 baris jurnal yang terisi");
    }

    if (!totals.balanced) {
      return toast.error(
        `Tidak balance: Debit ${formatRp(totals.d)} ≠ Kredit ${formatRp(totals.k)} (selisih ${formatRp(Math.abs(totals.d - totals.k))})`,
      );
    }

    setSaving(true);
    try {
      // Sabuk pengaman: tolak akun sistem (RK) di jurnal manual
      const ids = Array.from(new Set(valid.map((l) => l.account_id)));
      const { data: sysAccs } = await (supabase as any)
        .from("accounts")
        .select("id,kode_akun,nama_akun,is_system_account,is_manual_input")
        .in("id", ids);
      const blocked = (sysAccs ?? []).find((a: any) => a.is_system_account || a.is_manual_input === false);
      if (blocked) {
        throw new Error(
          `Akun "${blocked.kode_akun} ${blocked.nama_akun}" hanya dapat digunakan melalui transaksi transfer otomatis`,
        );
      }
      const { data: u, error: ue } = await supabase.auth.getUser();
      if (ue || !u.user) throw new Error("Sesi login tidak valid. Silakan login ulang.");
      const nomor = `JU-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-6)}`;
      const { data: j, error: e1 } = await (supabase as any)
        .from("journals")
        .insert({
          nomor_jurnal: nomor,
          tanggal,
          keterangan: keterangan.trim(),
          status: "posted",
          source: autoMode ? "auto" : "manual",
          created_by: u.user.id,
          business_unit_id: businessUnitId || defaultUnit?.id || null,
        })
        .select("id")
        .single();
      if (e1) throw e1;
      const payload = valid.map((l, idx) => ({
        journal_id: j!.id,
        account_id: l.account_id,
        debit: Number(l.debit) || 0,
        kredit: Number(l.kredit) || 0,
        line_order: idx,
        keterangan: l.keterangan?.trim() || null,
      }));
      const { error: e2 } = await supabase.from("journal_lines").insert(payload);
      if (e2) {
        await supabase.from("journals").delete().eq("id", j!.id);
        throw e2;
      }
      toast.success(`Jurnal ${nomor} tersimpan`);
      nav({ to: "/jurnal" });
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan jurnal");
    } finally {
      setSaving(false);
    }
  };

  const resolveAcc = (id: string) => accounts.find((a) => a.id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/jurnal">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Input Jurnal Baru</h1>
          <p className="text-sm text-muted-foreground">
            {autoMode
              ? "Mode Otomatis — cukup pilih jenis transaksi, sistem akan menentukan debit/kredit."
              : "Mode Manual — atur sendiri sisi debit & kredit (untuk akuntan)."}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card">
          {autoMode ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : (
            <Wrench className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="mode-toggle" className="text-sm cursor-pointer">
            {autoMode ? "Mode Otomatis" : "Mode Manual"}
          </Label>
          <Switch id="mode-toggle" checked={autoMode} onCheckedChange={setAutoMode} />
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tgl">Tanggal</Label>
            <Input id="tgl" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Unit Usaha</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={businessUnitId}
              onChange={(e) => setBusinessUnitId(e.target.value)}
            >
              {units.filter((u) => u.is_active).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.kode} — {u.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ket">Keterangan</Label>
            <Input
              id="ket"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Mis. Penerimaan kas penjualan tiket"
            />
          </div>
        </div>

        {autoMode ? (
          <AutoForm
            accounts={accounts}
            kasAccounts={kasAccounts}
            mainAccountChoices={mainAccountChoices}
            pendapatanChoices={pendapatanChoices}
            rule={currentRule}
            txnKind={txnKind}
            setTxnKind={setTxnKind}
            mainAccountId={mainAccountId}
            setMainAccountId={setMainAccountId}
            kasAccountId={kasAccountId}
            setKasAccountId={setKasAccountId}
            nominal={nominal}
            setNominal={setNominal}
            bunga={bunga}
            setBunga={setBunga}
            pendapatanBungaId={pendapatanBungaId}
            setPendapatanBungaId={setPendapatanBungaId}
            loading={loadingAcc}
            previewLines={autoLines}
            resolveAcc={resolveAcc}
          />
        ) : (
          <ManualForm
            accounts={accounts}
            lines={lines}
            loadingAcc={loadingAcc}
            onAccountChange={onAccountChange}
            setLine={setLine}
            setDebit={setDebit}
            setKredit={setKredit}
            removeLine={removeLine}
            addLine={() => setLines((ls) => [...ls, emptyLine()])}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Total Debit:</span> {formatRp(totals.d)} ·{" "}
            <span className="font-medium">Total Kredit:</span> {formatRp(totals.k)}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm font-medium px-3 py-1.5 rounded-md",
                totals.balanced
                  ? "bg-primary/10 text-primary"
                  : totals.d === 0 && totals.k === 0
                    ? "text-muted-foreground"
                    : "bg-destructive/10 text-destructive",
              )}
            >
              {totals.balanced
                ? "✓ Balance"
                : totals.d === 0 && totals.k === 0
                  ? "Belum ada nominal"
                  : `Selisih ${formatRp(Math.abs(totals.d - totals.k))}`}
            </span>
            <Button onClick={submit} disabled={saving || !totals.balanced}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {saving ? "Menyimpan..." : "Simpan Jurnal"}
            </Button>
          </div>
        </div>
      </Card>

      {autoMode ? (
        <p className="text-xs text-muted-foreground">
          💡 Mode Otomatis cocok untuk pengguna awam. Sistem otomatis menyusun sisi Debit & Kredit sesuai standar
          akuntansi double-entry. Akun kas default: <strong>{DEFAULT_KAS_NAME}</strong> — bisa diubah di atas.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          💡 Mode Manual: pilih akun terlebih dahulu — sistem otomatis menyarankan sisi <strong>Debit</strong> atau{" "}
          <strong>Kredit</strong> sesuai saldo normal akun (ASET &amp; BEBAN → Debit; KEWAJIBAN, EKUITAS, PENDAPATAN →
          Kredit).
        </p>
      )}
    </div>
  );
}

// ===== AUTO MODE FORM =====
function AutoForm({
  kasAccounts,
  mainAccountChoices,
  pendapatanChoices,
  rule,
  txnKind,
  setTxnKind,
  mainAccountId,
  setMainAccountId,
  kasAccountId,
  setKasAccountId,
  nominal,
  setNominal,
  bunga,
  setBunga,
  pendapatanBungaId,
  setPendapatanBungaId,
  loading,
  previewLines,
  resolveAcc,
}: {
  accounts: Acc[];
  kasAccounts: Acc[];
  mainAccountChoices: Acc[];
  pendapatanChoices: Acc[];
  rule: TxnRule;
  txnKind: TxnKind;
  setTxnKind: (k: TxnKind) => void;
  mainAccountId: string;
  setMainAccountId: (v: string) => void;
  kasAccountId: string;
  setKasAccountId: (v: string) => void;
  nominal: number;
  setNominal: (n: number) => void;
  bunga: number;
  setBunga: (n: number) => void;
  pendapatanBungaId: string;
  setPendapatanBungaId: (v: string) => void;
  loading: boolean;
  previewLines: Line[];
  resolveAcc: (id: string) => Acc | undefined;
}) {
  const isPiutang = txnKind === "terima_piutang";
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Jenis Transaksi</Label>
          <select
            value={txnKind}
            onChange={(e) => setTxnKind(e.target.value as TxnKind)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {TXN_RULES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{rule.description}</p>
        </div>
        <div className="space-y-1.5">
          <Label>
            {isPiutang
              ? "Nominal Piutang (Pokok)"
              : `Nominal ${rule.flow === "masuk" ? "(Uang Masuk)" : "(Uang Keluar)"}`}
          </Label>
          <Input
            inputMode="numeric"
            value={nominal ? formatNumberInput(nominal) : ""}
            onChange={(e) => setNominal(parseLocaleNumber(e.target.value))}
            placeholder="0"
            className="text-right text-lg font-semibold"
          />
          {isPiutang && (
            <p className="text-xs text-muted-foreground">
              Pokok pembayaran piutang (tidak termasuk bunga).
            </p>
          )}
        </div>
      </div>

      {isPiutang && (
        <div className="rounded-md border bg-amber-500/5 border-amber-500/30 p-4 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
              💡 Pembayaran Piutang dengan Bunga
            </p>
            <p className="text-muted-foreground">
              Jika terdapat bunga dalam pembayaran piutang, isi pada kolom bunga. Sistem akan otomatis
              memisahkan antara pengurangan piutang dan pendapatan bunga.
            </p>
            <p className="text-muted-foreground mt-1">
              Transaksi ini akan langsung dicatat sebagai pendapatan (bukan jurnal penyesuaian), karena
              kas sudah diterima.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bunga (Opsional)</Label>
              <Input
                inputMode="numeric"
                value={bunga ? formatNumberInput(bunga) : ""}
                onChange={(e) => setBunga(parseLocaleNumber(e.target.value))}
                placeholder="0"
                className="text-right"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Akun Pendapatan {bunga > 0 && <span className="text-destructive">*</span>}
              </Label>
              <AccountCombo
                accounts={pendapatanChoices}
                value={pendapatanBungaId}
                onChange={setPendapatanBungaId}
                loading={loading}
                placeholder="-- Pilih Akun Pendapatan Bunga --"
              />
            </div>
          </div>
          {nominal > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Total kas diterima:{" "}
              <span className="font-semibold text-foreground">{formatRp(nominal + bunga)}</span>{" "}
              (pokok {formatRp(nominal)} + bunga {formatRp(bunga)})
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{rule.mainAccountLabel}</Label>
          <AccountCombo
            accounts={mainAccountChoices}
            value={mainAccountId}
            onChange={setMainAccountId}
            loading={loading}
            placeholder={`-- Pilih ${rule.mainAccountLabel} --`}
            emptyMsg={
              mainAccountChoices.length === 0
                ? "Belum ada akun yang sesuai. Tambahkan dulu di menu Akun."
                : undefined
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Akun Kas / Bank {rule.flow === "masuk" ? "(penerima)" : "(sumber dana)"}</Label>
          <AccountCombo
            accounts={kasAccounts}
            value={kasAccountId}
            onChange={setKasAccountId}
            loading={loading}
            placeholder="-- Pilih Kas/Bank --"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-md border bg-muted/20 p-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Preview Jurnal
        </div>
        {previewLines.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Lengkapi pilihan akun dan nominal untuk melihat preview jurnal.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground text-left">
                  <th className="py-1">Akun</th>
                  <th className="py-1 text-right">Debit</th>
                  <th className="py-1 text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {previewLines.map((l, i) => {
                  const a = resolveAcc(l.account_id);
                  return (
                    <tr key={i} className="border-t">
                      <td className="py-1.5">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{a?.kode_akun}</span>
                        {a?.nama_akun}
                      </td>
                      <td className="py-1.5 text-right font-medium">{l.debit ? formatRp(l.debit) : "—"}</td>
                      <td className="py-1.5 text-right font-medium">{l.kredit ? formatRp(l.kredit) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== MANUAL MODE FORM =====
function ManualForm({
  accounts,
  lines,
  loadingAcc,
  onAccountChange,
  setLine,
  setDebit,
  setKredit,
  removeLine,
  addLine,
}: {
  accounts: Acc[];
  lines: Line[];
  loadingAcc: boolean;
  onAccountChange: (i: number, v: string) => void;
  setLine: (i: number, p: Partial<Line>) => void;
  setDebit: (i: number, v: string) => void;
  setKredit: (i: number, v: string) => void;
  removeLine: (i: number) => void;
  addLine: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 w-[45%]">Akun</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Kredit</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const acc = accounts.find((a) => a.id === l.account_id);
              const isDebitAcc = acc?.normal_balance === "DEBIT";
              const isKreditAcc = acc?.normal_balance === "KREDIT";
              return (
                <tr key={i} className="border-t align-top">
                  <td className="px-3 py-2">
                    <AccountCombo
                      accounts={accounts}
                      value={l.account_id}
                      loading={loadingAcc}
                      onChange={(v) => onAccountChange(i, v)}
                    />
                    <Input
                      value={l.keterangan ?? ""}
                      onChange={(e) => setLine(i, { keterangan: e.target.value })}
                      placeholder="Catatan baris (opsional)"
                      className="mt-1.5 h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="numeric"
                      value={l.debit ? formatNumberInput(l.debit) : ""}
                      onChange={(e) => setDebit(i, e.target.value)}
                      className={cn(
                        "text-right",
                        acc && isDebitAcc && "border-primary/40 bg-primary/5",
                        acc && isKreditAcc && "opacity-60",
                      )}
                      placeholder="0"
                      disabled={!l.account_id}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="numeric"
                      value={l.kredit ? formatNumberInput(l.kredit) : ""}
                      onChange={(e) => setKredit(i, e.target.value)}
                      className={cn(
                        "text-right",
                        acc && isKreditAcc && "border-primary/40 bg-primary/5",
                        acc && isDebitAcc && "opacity-60",
                      )}
                      placeholder="0"
                      disabled={!l.account_id}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(i)}
                      title="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" onClick={addLine}>
        <Plus className="h-4 w-4 mr-1" /> Tambah Baris
      </Button>
    </div>
  );
}

function AccountCombo({
  accounts,
  value,
  onChange,
  loading,
  placeholder,
  emptyMsg,
}: {
  accounts: Acc[];
  value: string;
  onChange: (v: string) => void;
  loading?: boolean;
  placeholder?: string;
  emptyMsg?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = accounts.find((a) => a.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {loading
              ? "Memuat akun..."
              : selected
                ? `${selected.kode_akun} — ${selected.nama_akun}`
                : (placeholder ?? "-- Pilih akun --")}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command
          filter={(val, search) => {
            const a = accounts.find((x) => x.id === val);
            if (!a) return 0;
            const hay = `${a.kode_akun} ${a.nama_akun}`.toLowerCase();
            return hay.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Cari kode atau nama akun..." />
          <CommandList>
            <CommandEmpty>{emptyMsg ?? "Akun tidak ditemukan."}</CommandEmpty>
            <CommandGroup>
              {accounts.map((a) => (
                <CommandItem
                  key={a.id}
                  value={a.id}
                  onSelect={(v) => {
                    onChange(v);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4 mr-2", value === a.id ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-xs text-muted-foreground mr-2">{a.kode_akun}</span>
                  <span className="flex-1 truncate">{a.nama_akun}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{a.normal_balance}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function parseLocaleNumber(s: string): number {
  if (!s) return 0;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}
function formatNumberInput(n: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("id-ID").format(n);
}
