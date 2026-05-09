import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2, ArrowLeft } from "lucide-react";
import { formatRp, todayISO } from "@/lib/format";
import { useBusinessUnit } from "@/lib/business-unit-context";
import { generateNomorJurnal } from "@/lib/activity-engine";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/transfer")({ component: TransferPage });

type Acc = {
  id: string;
  kode_akun: string;
  nama_akun: string;
  is_header: boolean;
  is_active: boolean;
  is_system_account?: boolean;
  is_manual_input?: boolean;
  business_unit_id?: string | null;
};

type Mode = "PENYERTAAN_TO_PUSAT" | "UNIT_TO_PUSAT" | "PUSAT_TO_UNIT" | "UNIT_TO_UNIT";

// RK Pusat ada di ekuitas (3.8.x). RK Unit ada di kewajiban (2.1.02.x).
const RK_PUSAT_PREFIXES = ["3.8.01.", "3.1.03."];
const RK_UNIT_PREFIX = "2.1.02.";
const KAS_PREFIX = "1.1.01.";

function TransferPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { units, defaultUnit } = useBusinessUnit();
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<Mode>("UNIT_TO_PUSAT");
  const [tanggal, setTanggal] = useState(todayISO());
  const [sourceUnitId, setSourceUnitId] = useState<string>("");
  const [targetUnitId, setTargetUnitId] = useState<string>("");
  const [kasAsalId, setKasAsalId] = useState<string>("");
  const [kasTujuanId, setKasTujuanId] = useState<string>("");
  const [jumlah, setJumlah] = useState<number>(0);
  const [keterangan, setKeterangan] = useState("");

  const pusat = units.find((u) => u.kode === 'PUSAT') || defaultUnit;
  const nonPusatUnits = useMemo(
    () => units.filter((u) => u.is_active && u.id !== pusat?.id),
    [units, pusat],
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id,kode_akun,nama_akun,is_header,is_active,is_system_account,is_manual_input,business_unit_id")
        .eq("is_active", true)
        .order("kode_akun");
      setAccounts((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const kasAccounts = useMemo(
    () => accounts.filter((a) => !a.is_header && a.kode_akun.startsWith(KAS_PREFIX)),
    [accounts],
  );

  const rkPusat = useMemo(
    () =>
      accounts.find(
        (a) => !a.is_header && RK_PUSAT_PREFIXES.some((p) => a.kode_akun.startsWith(p)),
      ) ?? null,
    [accounts],
  );

  // Find RK Unit account for a given unit (di KEWAJIBAN)
  const findRkUnit = (unitId: string): Acc | null => {
    return accounts.find(
      (a) => !a.is_header && a.kode_akun.startsWith(RK_UNIT_PREFIX) && a.business_unit_id === unitId,
    ) ?? null;
  };

  const reset = () => {
    setSourceUnitId("");
    setTargetUnitId("");
    setKasAsalId("");
    setKasTujuanId("");
    setJumlah(0);
    setKeterangan("");
  };

  const onModeChange = (m: Mode) => {
    setMode(m);
    reset();
  };

  const validate = (): string | null => {
    if (!pusat) return "Unit Pusat belum ditentukan";
    if (jumlah <= 0) return "Jumlah harus lebih dari 0";

    if (mode === "PENYERTAAN_TO_PUSAT") {
      if (!kasTujuanId) return "Akun kas tujuan wajib dipilih";
      const penyertaanAccount = accounts.find((a) => a.kode_akun === '3.1.04.01');
      if (!penyertaanAccount) return "Akun Modal Penyertaan tidak ditemukan di Bagan Akun";
    } else {
      if (!kasAsalId || !kasTujuanId) return "Akun kas asal & tujuan wajib dipilih";
      if (!rkPusat) return "Akun RK Pusat tidak ditemukan di Bagan Akun";

      if (mode === "UNIT_TO_PUSAT") {
        if (!sourceUnitId) return "Unit asal wajib dipilih";
        if (!findRkUnit(sourceUnitId)) return "Akun RK untuk unit asal belum dibuat";
      } else if (mode === "PUSAT_TO_UNIT") {
        if (!targetUnitId) return "Unit tujuan wajib dipilih";
        if (!findRkUnit(targetUnitId)) return "Akun RK untuk unit tujuan belum dibuat";
      } else {
        if (!sourceUnitId || !targetUnitId) return "Unit asal & tujuan wajib dipilih";
        if (sourceUnitId === targetUnitId) return "Unit asal & tujuan tidak boleh sama";
        if (!findRkUnit(sourceUnitId) || !findRkUnit(targetUnitId))
          return "Akun RK untuk salah satu unit belum dibuat";
      }
    }
    return null;
  };

  // Build pair of (unit_id, lines[]) representing journals
  type J = {
    unit_id: string;
    lines: Array<{ account_id: string; debit: number; kredit: number; keterangan: string }>;
    keterangan: string;
  };

  const buildJournals = (): J[] => {
    const amt = jumlah;
    if (mode === "PENYERTAAN_TO_PUSAT") {
      const penyertaanAccount = accounts.find((a) => a.kode_akun === '3.1.04.01');
      if (!penyertaanAccount) throw new Error("Akun Modal Penyertaan tidak ditemukan");
      const ket = keterangan || `Penyertaan modal ke Unit Pusat`;
      return [
        {
          unit_id: pusat!.id,
          keterangan: ket,
          lines: [
            { account_id: kasTujuanId, debit: amt, kredit: 0, keterangan: ket },
            { account_id: penyertaanAccount.id, debit: 0, kredit: amt, keterangan: ket },
          ],
        },
      ];
    }
    if (mode === "UNIT_TO_PUSAT") {
      const rkUnit = findRkUnit(sourceUnitId)!;
      const ket = keterangan || `Transfer dari ${units.find((u) => u.id === sourceUnitId)?.nama} ke Pusat`;
      return [
        {
          unit_id: sourceUnitId,
          keterangan: ket,
          lines: [
            { account_id: rkPusat!.id, debit: amt, kredit: 0, keterangan: ket },
            { account_id: kasAsalId, debit: 0, kredit: amt, keterangan: ket },
          ],
        },
        {
          unit_id: pusat!.id,
          keterangan: ket,
          lines: [
            { account_id: kasTujuanId, debit: amt, kredit: 0, keterangan: ket },
            { account_id: rkUnit.id, debit: 0, kredit: amt, keterangan: ket },
          ],
        },
      ];
    }
    if (mode === "PUSAT_TO_UNIT") {
      const rkUnit = findRkUnit(targetUnitId)!;
      const ket = keterangan || `Transfer dari Pusat ke ${units.find((u) => u.id === targetUnitId)?.nama}`;
      return [
        {
          unit_id: pusat!.id,
          keterangan: ket,
          lines: [
            { account_id: rkUnit.id, debit: amt, kredit: 0, keterangan: ket },
            { account_id: kasAsalId, debit: 0, kredit: amt, keterangan: ket },
          ],
        },
        {
          unit_id: targetUnitId,
          keterangan: ket,
          lines: [
            { account_id: kasTujuanId, debit: amt, kredit: 0, keterangan: ket },
            { account_id: rkPusat!.id, debit: 0, kredit: amt, keterangan: ket },
          ],
        },
      ];
    }
    // UNIT_TO_UNIT
    const rkSource = findRkUnit(sourceUnitId)!;
    const rkTarget = findRkUnit(targetUnitId)!;
    const ket =
      keterangan ||
      `Transfer dari ${units.find((u) => u.id === sourceUnitId)?.nama} ke ${units.find((u) => u.id === targetUnitId)?.nama}`;
    return [
      {
        unit_id: sourceUnitId,
        keterangan: ket,
        lines: [
          { account_id: rkTarget.id, debit: amt, kredit: 0, keterangan: ket },
          { account_id: kasAsalId, debit: 0, kredit: amt, keterangan: ket },
        ],
      },
      {
        unit_id: targetUnitId,
        keterangan: ket,
        lines: [
          { account_id: kasTujuanId, debit: amt, kredit: 0, keterangan: ket },
          { account_id: rkSource.id, debit: 0, kredit: amt, keterangan: ket },
        ],
      },
    ];
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const journals = buildJournals();
      const groupId = (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random()}`;
      const srcUid =
        mode === "PUSAT_TO_UNIT" ? pusat!.id :
        mode === "PENYERTAAN_TO_PUSAT" ? null :
        sourceUnitId;
      const tgtUid =
        mode === "UNIT_TO_PUSAT" || mode === "PENYERTAAN_TO_PUSAT" ? pusat!.id : targetUnitId;

      const created: string[] = [];
      for (const j of journals) {
        const nomor = await generateNomorJurnal(supabase as any, tanggal);
        const { data: jr, error: jerr } = await (supabase as any)
          .from("journals")
          .insert({
            nomor_jurnal: nomor,
            tanggal,
            keterangan: j.keterangan,
            business_unit_id: j.unit_id,
            status: "posted",
            source: "transfer",
            is_transfer_transaction: true,
            source_unit_id: srcUid,
            target_unit_id: tgtUid,
            transfer_group_id: groupId,
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();
        if (jerr) throw jerr;
        created.push(jr.id);
        const linesPayload = j.lines.map((l, idx) => ({
          journal_id: jr.id,
          account_id: l.account_id,
          debit: l.debit,
          kredit: l.kredit,
          keterangan: l.keterangan,
          line_order: idx,
        }));
        const { error: lerr } = await (supabase as any)
          .from("journal_lines")
          .insert(linesPayload);
        if (lerr) throw lerr;
      }
      toast.success(`Transfer berhasil — ${created.length} jurnal otomatis dibuat`);
      nav({ to: "/jurnal" });
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memproses transfer");
    } finally {
      setSaving(false);
    }
  };

  const preview = useMemo(() => {
    if (jumlah <= 0) return null;
    const err = validate();
    if (err) return null;
    return buildJournals();
  }, [mode, sourceUnitId, targetUnitId, kasAsalId, kasTujuanId, jumlah, keterangan, accounts]);

  const accName = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.kode_akun} — ${a.nama_akun}` : "—";
  };
  const unitName = (id: string) => units.find((u) => u.id === id)?.nama ?? "—";

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dashboard" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Transfer Antar Unit
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistem otomatis membuat jurnal RK di kedua sisi — Anda tidak perlu memilih akun RK.
          </p>
        </div>
      </div>

      <Card className="p-5 space-y-5">
        <div>
          <Label className="mb-2 block">Jenis Transfer</Label>
          <RadioGroup value={mode} onValueChange={(v) => onModeChange(v as Mode)} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { v: "PENYERTAAN_TO_PUSAT", label: "Penyertaan → Pusat" },
              { v: "UNIT_TO_PUSAT", label: "Unit → Pusat" },
              { v: "PUSAT_TO_UNIT", label: "Pusat → Unit" },
              { v: "UNIT_TO_UNIT", label: "Antar Unit" },
            ].map((opt) => (
              <label
                key={opt.v}
                className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50 ${mode === opt.v ? "border-primary bg-muted/40" : ""}`}
              >
                <RadioGroupItem value={opt.v} />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div>
            <Label>Jumlah (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={jumlah || ""}
              onChange={(e) => setJumlah(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          {mode !== "PUSAT_TO_UNIT" && mode !== "PENYERTAAN_TO_PUSAT" && (
            <div>
              <Label>Unit Asal</Label>
              <Select value={sourceUnitId} onValueChange={setSourceUnitId}>
                <SelectTrigger><SelectValue placeholder="Pilih unit asal…" /></SelectTrigger>
                <SelectContent>
                  {nonPusatUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.kode} — {u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === "PUSAT_TO_UNIT" && (
            <div>
              <Label>Unit Asal</Label>
              <Input value={pusat ? `PUSAT — ${pusat.nama}` : "—"} disabled />
            </div>
          )}

          {mode !== "UNIT_TO_PUSAT" && mode !== "PENYERTAAN_TO_PUSAT" && (
            <div>
              <Label>Unit Tujuan</Label>
              <Select value={targetUnitId} onValueChange={setTargetUnitId}>
                <SelectTrigger><SelectValue placeholder="Pilih unit tujuan…" /></SelectTrigger>
                <SelectContent>
                  {nonPusatUnits
                    .filter((u) => u.id !== sourceUnitId)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.kode} — {u.nama}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === "UNIT_TO_PUSAT" && (
            <div>
              <Label>Unit Tujuan</Label>
              <Input value={pusat ? `PUSAT — ${pusat.nama}` : "—"} disabled />
            </div>
          )}
          {mode === "PENYERTAAN_TO_PUSAT" && (
            <div>
              <Label>Unit Tujuan</Label>
              <Input value={pusat ? `PUSAT — ${pusat.nama}` : "—"} disabled />
            </div>
          )}

          {mode !== "PENYERTAAN_TO_PUSAT" && (
            <div>
              <Label>Akun Kas Asal (yang berkurang)</Label>
              <Select value={kasAsalId} onValueChange={setKasAsalId}>
                <SelectTrigger><SelectValue placeholder="Pilih kas asal…" /></SelectTrigger>
                <SelectContent>
                  {kasAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.kode_akun} — {a.nama_akun}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Akun Kas Tujuan (yang bertambah)</Label>
            <Select value={kasTujuanId} onValueChange={setKasTujuanId}>
              <SelectTrigger><SelectValue placeholder="Pilih kas tujuan…" /></SelectTrigger>
              <SelectContent>
                {kasAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.kode_akun} — {a.nama_akun}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Keterangan (opsional)</Label>
          <Input
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Tambahan catatan jika perlu"
          />
        </div>
      </Card>

      {preview && (
        <Card className="p-5 space-y-4">
          <div className="text-sm font-semibold">Pratinjau Jurnal Otomatis</div>
          {preview.map((j, idx) => (
            <div key={idx} className="rounded border">
              <div className="bg-muted/40 px-3 py-2 text-xs font-medium">
                Jurnal #{idx + 1} — Unit: {unitName(j.unit_id)}
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-1">Akun</th>
                    <th className="text-right px-3 py-1">Debit</th>
                    <th className="text-right px-3 py-1">Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {j.lines.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1 font-mono text-xs">{accName(l.account_id)}</td>
                      <td className="px-3 py-1 text-right">{l.debit ? formatRp(l.debit) : "—"}</td>
                      <td className="px-3 py-1 text-right">{l.kredit ? formatRp(l.kredit) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={reset} disabled={saving}>Bersihkan</Button>
        <Button onClick={submit} disabled={saving || jumlah <= 0}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Proses Transfer"}
        </Button>
      </div>
    </div>
  );
}
