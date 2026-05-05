import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRp, formatDate, todayISO } from "@/lib/format";
import { RefreshCw, AlertTriangle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/jurnal/koreksi")({
  component: JurnalKoreksi,
});

type Acc = {
  id: string;
  kode_akun: string;
  nama_akun: string;
  normal_balance: "DEBIT" | "KREDIT";
  is_header: boolean;
};

type Line = {
  id: string;
  account_id: string;
  debit: number;
  kredit: number;
  keterangan: string | null;
};

type Journal = {
  id: string;
  nomor_jurnal: string;
  tanggal: string;
  keterangan: string;
  status: string;
  source: string;
  is_correction: boolean;
  correction_type: string | null;
  correction_group_id: string | null;
  created_by: string | null;
  business_unit_id: string | null;
  journal_lines: Line[];
  _creator?: string;
};

type Mode = "reversal" | "reklasifikasi" | "nominal" | "periode";

const newNomor = (prefix = "KOR") =>
  `${prefix}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-6)}`;

function totalLines(ls: Line[]) {
  return ls.reduce((s, l) => s + Number(l.debit || 0), 0);
}

function JurnalKoreksi() {
  const [rows, setRows] = useState<Journal[]>([]);
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Journal | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: js }, { data: accs }] = await Promise.all([
      supabase
        .from("journals")
        .select(
          "id,nomor_jurnal,tanggal,keterangan,status,source,is_correction,correction_type,correction_group_id,created_by,business_unit_id,journal_lines(id,account_id,debit,kredit,keterangan)"
        )
        .eq("status", "posted")
        .order("tanggal", { ascending: false })
        .order("nomor_jurnal", { ascending: false })
        .limit(200),
      supabase.from("accounts").select("id,kode_akun,nama_akun,normal_balance,is_header").eq("is_active", true).eq("is_manual_input", true),
    ]);

    const journals = (js as Journal[]) ?? [];
    const creatorIds = Array.from(new Set(journals.map((j) => j.created_by).filter(Boolean))) as string[];
    if (creatorIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", creatorIds);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      journals.forEach((j) => (j._creator = j.created_by ? (map.get(j.created_by) ?? "—") : "—"));
    }
    setRows(journals);
    setAccounts((accs as Acc[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nomor_jurnal.toLowerCase().includes(q) ||
        r.keterangan.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const closeDialog = () => {
    setSelected(null);
    setMode(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className="h-6 w-6" /> Jurnal Koreksi
        </h1>
        <p className="text-sm text-muted-foreground">
          Lakukan koreksi terhadap jurnal yang sudah diposting. Audit trail tetap terjaga.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-md border bg-accent/40 p-3 text-sm">
        <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">
            Jurnal yang sudah diposting tidak dapat diubah atau dihapus.
          </div>
          <div className="text-muted-foreground">
            Gunakan fitur koreksi: Reversal, Reklasifikasi, Koreksi Nominal, atau Koreksi Periode.
            Setiap koreksi akan dicatat sebagai jurnal baru dengan referensi ke jurnal asli.
          </div>
        </div>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor jurnal atau keterangan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2">Nomor</th>
                <th className="px-4 py-2">Tanggal</th>
                <th className="px-4 py-2">Keterangan</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Dibuat Oleh</th>
                <th className="px-4 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Memuat…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((j) => {
                  const total = totalLines(j.journal_lines);
                  return (
                    <tr key={j.id} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{j.nomor_jurnal}</td>
                      <td className="px-4 py-2">{formatDate(j.tanggal)}</td>
                      <td className="px-4 py-2 max-w-xs truncate" title={j.keterangan}>
                        {j.keterangan}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{formatRp(total)}</td>
                      <td className="px-4 py-2">
                        {j.is_correction ? (
                          <Badge className="bg-secondary text-secondary-foreground border border-primary/40">
                            Koreksi {j.correction_type ? `· ${j.correction_type}` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Normal</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{j._creator ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(j)}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Koreksi
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Tidak ada jurnal posted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pilih jenis koreksi */}
      <Dialog open={!!selected && !mode} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Jenis Koreksi</DialogTitle>
            <DialogDescription>
              {selected ? (
                <>
                  Jurnal <span className="font-mono">{selected.nomor_jurnal}</span> —{" "}
                  {formatDate(selected.tanggal)} · {formatRp(totalLines(selected.journal_lines))}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" className="justify-start" onClick={() => setMode("reversal")}>
              🔁 Reversal — Membalik debit/kredit jurnal asal
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => setMode("reklasifikasi")}>
              🔄 Reklasifikasi — Pindah ke akun yang benar
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => setMode("nominal")}>
              ✏️ Koreksi Nominal — Perbaiki nilai yang salah
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => setMode("periode")}>
              📆 Koreksi Periode — Reversal + jurnal baru di tanggal benar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selected && mode && (
        <KoreksiDialog
          journal={selected}
          accounts={accounts}
          mode={mode}
          onClose={closeDialog}
          onDone={async () => {
            closeDialog();
            await load();
          }}
        />
      )}
    </div>
  );
}

/* ============== Koreksi Dialog ============== */

function KoreksiDialog({
  journal,
  accounts,
  mode,
  onClose,
  onDone,
}: {
  journal: Journal;
  accounts: Acc[];
  mode: Mode;
  onClose: () => void;
  onDone: () => void;
}) {
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const total = totalLines(journal.journal_lines);

  // Reklasifikasi state
  const [fromAccountId, setFromAccountId] = useState<string>(
    journal.journal_lines[0]?.account_id ?? ""
  );
  const [toAccountId, setToAccountId] = useState<string>("");
  const [reklasNominal, setReklasNominal] = useState<number>(total);

  // Nominal state
  const [nominalAccountId, setNominalAccountId] = useState<string>(
    journal.journal_lines[0]?.account_id ?? ""
  );
  const [nilaiBenar, setNilaiBenar] = useState<number>(0);

  // Periode state
  const [tglBenar, setTglBenar] = useState<string>(todayISO());

  const [keterangan, setKeterangan] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const today = todayISO();

  const submit = async () => {
    setSaving(true);
    try {
      const { data: u, error: ue } = await supabase.auth.getUser();
      if (ue || !u.user) throw new Error("Sesi login tidak valid.");

      const groupId = journal.correction_group_id ?? journal.id;

      if (mode === "reversal") {
        await createCorrectionJournal({
          tanggal: today,
          keterangan:
            keterangan.trim() ||
            `Reversal jurnal ${journal.nomor_jurnal} — ${journal.keterangan}`,
          correction_type: "reversal",
          correction_group_id: groupId,
          source_ref: journal.id,
          created_by: u.user.id,
          business_unit_id: journal.business_unit_id,
          lines: journal.journal_lines.map((l) => ({
            account_id: l.account_id,
            debit: Number(l.kredit) || 0,
            kredit: Number(l.debit) || 0,
            keterangan: l.keterangan ?? null,
          })),
        });
        toast.success("Reversal berhasil dibuat");
      } else if (mode === "reklasifikasi") {
        if (!fromAccountId || !toAccountId) throw new Error("Pilih akun asal dan tujuan");
        if (fromAccountId === toAccountId) throw new Error("Akun asal dan tujuan harus berbeda");
        if (!reklasNominal || reklasNominal <= 0) throw new Error("Nominal harus > 0");
        const fromAcc = accMap.get(fromAccountId);
        if (!fromAcc) throw new Error("Akun asal tidak ditemukan");
        // Aturan: balikkan akun lama sesuai normal balance, taruh di akun baru
        const lines =
          fromAcc.normal_balance === "DEBIT"
            ? [
                { account_id: toAccountId, debit: reklasNominal, kredit: 0 },
                { account_id: fromAccountId, debit: 0, kredit: reklasNominal },
              ]
            : [
                { account_id: fromAccountId, debit: reklasNominal, kredit: 0 },
                { account_id: toAccountId, debit: 0, kredit: reklasNominal },
              ];
        await createCorrectionJournal({
          tanggal: today,
          keterangan:
            keterangan.trim() ||
            `Reklasifikasi dari ${fromAcc.kode_akun} ke ${accMap.get(toAccountId)?.kode_akun ?? ""} — ref ${journal.nomor_jurnal}`,
          correction_type: "reklasifikasi",
          correction_group_id: groupId,
          source_ref: journal.id,
          created_by: u.user.id,
          business_unit_id: journal.business_unit_id,
          lines: lines.map((l) => ({ ...l, keterangan: null })),
        });
        toast.success("Reklasifikasi berhasil dibuat");
      } else if (mode === "nominal") {
        if (!nominalAccountId) throw new Error("Pilih akun yang dikoreksi");
        const acc = accMap.get(nominalAccountId);
        if (!acc) throw new Error("Akun tidak ditemukan");
        const old = journal.journal_lines.find((l) => l.account_id === nominalAccountId);
        if (!old) throw new Error("Akun tidak ada di jurnal asal");
        const oldVal = Number(old.debit) > 0 ? Number(old.debit) : Number(old.kredit);
        const oldSide: "D" | "K" = Number(old.debit) > 0 ? "D" : "K";
        const selisih = nilaiBenar - oldVal;
        if (selisih === 0) throw new Error("Tidak ada selisih untuk dikoreksi");

        // Pasangan kontra: cari akun lawan terbesar di jurnal asal
        const counter = [...journal.journal_lines]
          .filter((l) => l.account_id !== nominalAccountId)
          .sort(
            (a, b) =>
              Math.max(Number(b.debit), Number(b.kredit)) -
              Math.max(Number(a.debit), Number(a.kredit))
          )[0];
        if (!counter) throw new Error("Tidak ada akun lawan di jurnal asal");
        const counterSide: "D" | "K" = Number(counter.debit) > 0 ? "D" : "K";

        // Jika selisih > 0: tambahkan di sisi yang sama dengan jurnal asal
        // Jika selisih < 0: balik sisi
        const abs = Math.abs(selisih);
        const sideForMain: "D" | "K" = selisih > 0 ? oldSide : oldSide === "D" ? "K" : "D";
        const sideForCounter: "D" | "K" =
          selisih > 0 ? counterSide : counterSide === "D" ? "K" : "D";

        const lines = [
          {
            account_id: nominalAccountId,
            debit: sideForMain === "D" ? abs : 0,
            kredit: sideForMain === "K" ? abs : 0,
            keterangan: null as string | null,
          },
          {
            account_id: counter.account_id,
            debit: sideForCounter === "D" ? abs : 0,
            kredit: sideForCounter === "K" ? abs : 0,
            keterangan: null as string | null,
          },
        ];

        await createCorrectionJournal({
          tanggal: today,
          keterangan:
            keterangan.trim() ||
            `Koreksi nominal ${acc.kode_akun} (${formatRp(oldVal)} → ${formatRp(nilaiBenar)}) — ref ${journal.nomor_jurnal}`,
          correction_type: "nominal",
          correction_group_id: groupId,
          source_ref: journal.id,
          created_by: u.user.id,
          business_unit_id: journal.business_unit_id,
          lines,
        });
        toast.success("Koreksi nominal berhasil dibuat");
      } else if (mode === "periode") {
        if (!tglBenar) throw new Error("Tanggal benar wajib diisi");
        // 1) Reversal di hari ini
        await createCorrectionJournal({
          tanggal: today,
          keterangan: `Reversal koreksi periode ${journal.nomor_jurnal}`,
          correction_type: "periode",
          correction_group_id: groupId,
          source_ref: journal.id,
          created_by: u.user.id,
          business_unit_id: journal.business_unit_id,
          lines: journal.journal_lines.map((l) => ({
            account_id: l.account_id,
            debit: Number(l.kredit) || 0,
            kredit: Number(l.debit) || 0,
            keterangan: l.keterangan ?? null,
          })),
        });
        // 2) Jurnal baru di tanggal benar
        await createCorrectionJournal({
          tanggal: tglBenar,
          keterangan:
            keterangan.trim() ||
            `Koreksi periode — pindah dari ${journal.tanggal} ke ${tglBenar} (ref ${journal.nomor_jurnal})`,
          correction_type: "periode",
          correction_group_id: groupId,
          source_ref: journal.id,
          created_by: u.user.id,
          business_unit_id: journal.business_unit_id,
          lines: journal.journal_lines.map((l) => ({
            account_id: l.account_id,
            debit: Number(l.debit) || 0,
            kredit: Number(l.kredit) || 0,
            keterangan: l.keterangan ?? null,
          })),
        });
        toast.success("Koreksi periode berhasil dibuat");
      }

      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal membuat koreksi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "reversal" && "🔁 Reversal Jurnal"}
            {mode === "reklasifikasi" && "🔄 Reklasifikasi Akun"}
            {mode === "nominal" && "✏️ Koreksi Nominal"}
            {mode === "periode" && "📆 Koreksi Periode"}
          </DialogTitle>
          <DialogDescription>
            Jurnal asal:{" "}
            <span className="font-mono">{journal.nomor_jurnal}</span> ·{" "}
            {formatDate(journal.tanggal)} · {formatRp(total)}
          </DialogDescription>
        </DialogHeader>

        {/* Preview jurnal asal */}
        <div className="rounded-md border bg-muted/30 p-3 max-h-40 overflow-y-auto text-xs">
          <div className="font-medium mb-1">Baris jurnal asal:</div>
          <table className="w-full">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left">Akun</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {journal.journal_lines.map((l) => {
                const a = accMap.get(l.account_id);
                return (
                  <tr key={l.id}>
                    <td>
                      {a ? `${a.kode_akun} — ${a.nama_akun}` : l.account_id}
                    </td>
                    <td className="text-right">{Number(l.debit) > 0 ? formatRp(Number(l.debit)) : "-"}</td>
                    <td className="text-right">{Number(l.kredit) > 0 ? formatRp(Number(l.kredit)) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          {mode === "reklasifikasi" && (
            <>
              <div className="grid gap-1.5">
                <Label>Akun Asal (yang salah)</Label>
                <AccountSelect value={fromAccountId} onChange={setFromAccountId} accounts={accounts} />
              </div>
              <div className="grid gap-1.5">
                <Label>Akun Tujuan (yang benar)</Label>
                <AccountSelect value={toAccountId} onChange={setToAccountId} accounts={accounts} />
              </div>
              <div className="grid gap-1.5">
                <Label>Nominal yang Direklasifikasi</Label>
                <Input
                  type="number"
                  value={reklasNominal || ""}
                  onChange={(e) => setReklasNominal(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {mode === "nominal" && (
            <>
              <div className="grid gap-1.5">
                <Label>Akun yang Dikoreksi</Label>
                <Select value={nominalAccountId} onValueChange={setNominalAccountId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {journal.journal_lines.map((l) => {
                      const a = accMap.get(l.account_id);
                      const v = Number(l.debit) > 0 ? l.debit : l.kredit;
                      return (
                        <SelectItem key={l.id} value={l.account_id}>
                          {a ? `${a.kode_akun} — ${a.nama_akun}` : l.account_id} ({formatRp(Number(v))})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Nilai yang Benar</Label>
                <Input
                  type="number"
                  value={nilaiBenar || ""}
                  onChange={(e) => setNilaiBenar(Number(e.target.value))}
                />
                <div className="text-xs text-muted-foreground">
                  Sistem akan otomatis menghitung selisih dan menentukan debit/kredit.
                </div>
              </div>
            </>
          )}

          {mode === "periode" && (
            <div className="grid gap-1.5">
              <Label>Tanggal yang Benar</Label>
              <Input type="date" value={tglBenar} onChange={(e) => setTglBenar(e.target.value)} />
              <div className="text-xs text-muted-foreground">
                Sistem akan membuat reversal hari ini, lalu jurnal baru di tanggal yang benar.
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>Keterangan Koreksi (opsional)</Label>
            <Input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Akan diisi otomatis bila kosong"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Buat Koreksi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountSelect({
  value,
  onChange,
  accounts,
}: {
  value: string;
  onChange: (v: string) => void;
  accounts: Acc[];
}) {
  const opts = accounts.filter((a) => !a.is_header);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Pilih akun…" /></SelectTrigger>
      <SelectContent className="max-h-72">
        {opts
          .sort((a, b) => a.kode_akun.localeCompare(b.kode_akun))
          .map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.kode_akun} — {a.nama_akun}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

/* ============== Helper: insert jurnal koreksi ============== */
async function createCorrectionJournal(params: {
  tanggal: string;
  keterangan: string;
  correction_type: "reversal" | "reklasifikasi" | "nominal" | "periode";
  correction_group_id: string;
  source_ref: string;
  created_by: string;
  business_unit_id: string | null;
  lines: { account_id: string; debit: number; kredit: number; keterangan: string | null }[];
}) {
  // Validasi balance
  const td = params.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const tk = params.lines.reduce((s, l) => s + (Number(l.kredit) || 0), 0);
  if (Math.round(td * 100) !== Math.round(tk * 100)) {
    throw new Error(`Jurnal koreksi tidak balance: D ${td} ≠ K ${tk}`);
  }

  const nomor = newNomor("KOR");
  const insertPayload: any = {
    nomor_jurnal: nomor,
    tanggal: params.tanggal,
    keterangan: params.keterangan,
    status: "posted",
    source: "correction",
    source_ref: params.source_ref,
    is_correction: true,
    correction_type: params.correction_type,
    correction_group_id: params.correction_group_id,
    created_by: params.created_by,
  };
  if (params.business_unit_id) insertPayload.business_unit_id = params.business_unit_id;
  const { data: j, error: e1 } = await (supabase as any)
    .from("journals")
    .insert(insertPayload)
    .select("id")
    .single();
  if (e1) throw e1;

  const payload = params.lines.map((l, idx) => ({
    journal_id: j!.id,
    account_id: l.account_id,
    debit: Number(l.debit) || 0,
    kredit: Number(l.kredit) || 0,
    line_order: idx,
    keterangan: l.keterangan,
  }));
  const { error: e2 } = await supabase.from("journal_lines").insert(payload);
  if (e2) {
    await supabase.from("journals").delete().eq("id", j!.id);
    throw e2;
  }
}
