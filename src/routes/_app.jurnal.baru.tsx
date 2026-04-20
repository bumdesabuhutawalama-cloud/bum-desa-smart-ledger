import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatRp, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus, ArrowLeft, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Acc = {
  id: string;
  kode_akun: string;
  nama_akun: string;
  normal_balance: "DEBIT" | "KREDIT";
  is_header: boolean;
  tipe_akun: string;
};
type Line = { account_id: string; debit: number; kredit: number; keterangan?: string };

export const Route = createFileRoute("/_app/jurnal/baru")({ component: JurnalBaru });

const emptyLine = (): Line => ({ account_id: "", debit: 0, kredit: 0 });

function JurnalBaru() {
  const nav = useNavigate();
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [loadingAcc, setLoadingAcc] = useState(true);
  const [tanggal, setTanggal] = useState(todayISO());
  const [keterangan, setKeterangan] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id,kode_akun,nama_akun,normal_balance,is_header,tipe_akun")
        .eq("is_header", false)
        .eq("is_active", true)
        .order("kode_akun");
      if (!mounted) return;
      if (error) toast.error("Gagal memuat akun: " + error.message);
      setAccounts((data as Acc[]) ?? []);
      setLoadingAcc(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const d = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const k = lines.reduce((s, l) => s + (Number(l.kredit) || 0), 0);
    return { d, k, balanced: Math.abs(d - k) < 0.005 && d > 0 };
  }, [lines]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const removeLine = (i: number) => {
    if (lines.length <= 2) {
      toast.warning("Minimal 2 baris jurnal");
      return;
    }
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  };

  // Saat akun dipilih, otomatis isi sisi debit/kredit sesuai saldo normal
  // dengan selisih balance saat ini (smart suggestion).
  const onAccountChange = (i: number, accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) {
      setLine(i, { account_id: accId });
      return;
    }
    const otherD = lines.reduce((s, l, idx) => s + (idx !== i ? Number(l.debit) || 0 : 0), 0);
    const otherK = lines.reduce((s, l, idx) => s + (idx !== i ? Number(l.kredit) || 0 : 0), 0);
    const diff = otherD - otherK; // jika positif: butuh kredit; jika negatif: butuh debit
    const cur = lines[i];
    const sudahAdaAngka = (cur.debit || 0) > 0 || (cur.kredit || 0) > 0;
    if (sudahAdaAngka) {
      setLine(i, { account_id: accId });
      return;
    }
    if (diff > 0) {
      setLine(i, { account_id: accId, debit: 0, kredit: diff });
    } else if (diff < 0) {
      setLine(i, { account_id: accId, debit: Math.abs(diff), kredit: 0 });
    } else {
      setLine(i, { account_id: accId });
    }
    // diff 0 → biarkan user input; sisi yang disarankan ditandai visual via normal_balance
  };

  const setDebit = (i: number, val: string) => {
    const num = parseLocaleNumber(val);
    setLine(i, { debit: num, kredit: 0 });
  };
  const setKredit = (i: number, val: string) => {
    const num = parseLocaleNumber(val);
    setLine(i, { kredit: num, debit: 0 });
  };

  const submit = async () => {
    if (!tanggal) return toast.error("Tanggal wajib diisi");
    if (!keterangan.trim()) return toast.error("Keterangan wajib diisi");
    const valid = lines.filter((l) => l.account_id && ((l.debit || 0) > 0 || (l.kredit || 0) > 0));
    if (valid.length < 2) return toast.error("Minimal 2 baris jurnal yang terisi");
    if (!totals.balanced) {
      return toast.error(
        `Tidak balance: Debit ${formatRp(totals.d)} ≠ Kredit ${formatRp(totals.k)} (selisih ${formatRp(Math.abs(totals.d - totals.k))})`,
      );
    }
    // pastikan tidak ada akun ganda dengan sisi yang sama
    setSaving(true);
    try {
      const { data: u, error: ue } = await supabase.auth.getUser();
      if (ue || !u.user) throw new Error("Sesi login tidak valid. Silakan login ulang.");
      const nomor = `JU-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-6)}`;
      const { data: j, error: e1 } = await supabase
        .from("journals")
        .insert({
          nomor_jurnal: nomor,
          tanggal,
          keterangan: keterangan.trim(),
          status: "posted",
          source: "manual",
          created_by: u.user.id,
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
        // rollback header
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/jurnal">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Input Jurnal Baru</h1>
          <p className="text-sm text-muted-foreground">Pencatatan double-entry — total Debit harus sama dengan Kredit</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tgl">Tanggal</Label>
            <Input id="tgl" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
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
            <tfoot className="bg-muted/30">
              <tr className="border-t font-semibold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{formatRp(totals.d)}</td>
                <td className="px-3 py-2 text-right">{formatRp(totals.k)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Baris
          </Button>
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

      <p className="text-xs text-muted-foreground">
        💡 Tip: pilih akun terlebih dahulu — sistem otomatis menyarankan sisi <strong>Debit</strong> atau{" "}
        <strong>Kredit</strong> sesuai saldo normal akun (ASET &amp; BEBAN → Debit; KEWAJIBAN, EKUITAS, PENDAPATAN →
        Kredit) dan akan otomatis menyeimbangkan dengan baris sebelumnya.
      </p>
    </div>
  );
}

function AccountCombo({
  accounts,
  value,
  onChange,
  loading,
}: {
  accounts: Acc[];
  value: string;
  onChange: (v: string) => void;
  loading?: boolean;
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
                : "-- Pilih akun --"}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command
          filter={(val, search) => {
            // val adalah id akun; cari di kode + nama
            const a = accounts.find((x) => x.id === val);
            if (!a) return 0;
            const hay = `${a.kode_akun} ${a.nama_akun}`.toLowerCase();
            return hay.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Cari kode atau nama akun..." />
          <CommandList>
            <CommandEmpty>Akun tidak ditemukan.</CommandEmpty>
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
  // hilangkan separator titik & koma, ambil digit saja (asumsi rupiah tanpa desimal)
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}
function formatNumberInput(n: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("id-ID").format(n);
}
