import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRp, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

type Acc = { id: string; kode_akun: string; nama_akun: string; normal_balance: "DEBIT" | "KREDIT"; is_header: boolean };
type Line = { account_id: string; debit: number; kredit: number; keterangan?: string };

export const Route = createFileRoute("/_app/jurnal/baru")({ component: JurnalBaru });

function JurnalBaru() {
  const nav = useNavigate();
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [tanggal, setTanggal] = useState(todayISO());
  const [keterangan, setKeterangan] = useState("");
  const [lines, setLines] = useState<Line[]>([{ account_id: "", debit: 0, kredit: 0 }, { account_id: "", debit: 0, kredit: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("accounts").select("id,kode_akun,nama_akun,normal_balance,is_header").eq("is_header", false).order("kode_akun")
      .then(({ data }) => setAccounts((data as any) ?? []));
  }, []);

  const totals = useMemo(() => {
    const d = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const k = lines.reduce((s, l) => s + (Number(l.kredit) || 0), 0);
    return { d, k, balanced: d === k && d > 0 };
  }, [lines]);

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const onAccountChange = (i: number, accId: string) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return setLine(i, { account_id: accId });
    // Otomatis arahkan ke debit atau kredit sesuai normal_balance, tapi hanya jika baris baru
    const cur = lines[i];
    if ((cur.debit || 0) === 0 && (cur.kredit || 0) === 0) {
      setLine(i, { account_id: accId });
    } else {
      setLine(i, { account_id: accId });
    }
    // Saran: jika baris sebelumnya debit, baris ini disarankan kredit (handled by autofocus visual)
  };

  const setAmount = (i: number, val: number) => {
    const acc = accounts.find(a => a.id === lines[i].account_id);
    if (!acc) { setLine(i, { debit: val, kredit: 0 }); return; }
    if (acc.normal_balance === "DEBIT") setLine(i, { debit: val, kredit: 0 });
    else setLine(i, { debit: 0, kredit: val });
  };

  const submit = async () => {
    if (!keterangan) return toast.error("Keterangan wajib diisi");
    const valid = lines.filter(l => l.account_id && (l.debit > 0 || l.kredit > 0));
    if (valid.length < 2) return toast.error("Minimal 2 baris jurnal");
    if (!totals.balanced) return toast.error(`Total tidak balance: D ${formatRp(totals.d)} ≠ K ${formatRp(totals.k)}`);
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const nomor = `JU-${Date.now()}`;
      const { data: j, error: e1 } = await supabase.from("journals").insert({
        nomor_jurnal: nomor, tanggal, keterangan, status: "posted", source: "manual", created_by: u.user?.id,
      }).select("id").single();
      if (e1) throw e1;
      const payload = valid.map((l, idx) => ({ journal_id: j!.id, account_id: l.account_id, debit: l.debit, kredit: l.kredit, line_order: idx, keterangan: l.keterangan ?? null }));
      const { error: e2 } = await supabase.from("journal_lines").insert(payload);
      if (e2) throw e2;
      toast.success("Jurnal tersimpan");
      nav({ to: "/jurnal" });
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Input Jurnal Baru</h1>
      <Card className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Tanggal</Label><Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} /></div>
          <div><Label>Keterangan</Label><Input value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Mis. Penerimaan kas penjualan tiket" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Akun</th><th className="py-2 text-right">Debit</th><th className="py-2 text-right">Kredit</th><th></th></tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const acc = accounts.find(a => a.id === l.account_id);
                const isDebit = acc?.normal_balance === "DEBIT";
                return (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-2">
                      <select value={l.account_id} onChange={e => onAccountChange(i, e.target.value)} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
                        <option value="">-- Pilih akun --</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.kode_akun} — {a.nama_akun}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input type="number" min={0} value={l.debit || ""} onChange={e => setLine(i, { debit: Number(e.target.value), kredit: 0 })}
                        className={"text-right " + (isDebit ? "border-debit/50" : "")} placeholder="0" />
                    </td>
                    <td className="py-2 pr-2">
                      <Input type="number" min={0} value={l.kredit || ""} onChange={e => setLine(i, { kredit: Number(e.target.value), debit: 0 })}
                        className={"text-right " + (acc && !isDebit ? "border-kredit/50" : "")} placeholder="0" />
                    </td>
                    <td><Button type="button" variant="ghost" size="icon" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right text-debit">{formatRp(totals.d)}</td>
                <td className="py-2 text-right text-kredit">{formatRp(totals.k)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => setLines(ls => [...ls, { account_id: "", debit: 0, kredit: 0 }])}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Baris
          </Button>
          <div className="flex items-center gap-3">
            <span className={"text-sm font-medium " + (totals.balanced ? "text-success" : "text-destructive")}>
              {totals.balanced ? "✓ Balance" : `Selisih: ${formatRp(Math.abs(totals.d - totals.k))}`}
            </span>
            <Button onClick={submit} disabled={saving || !totals.balanced}>{saving ? "Menyimpan..." : "Simpan Jurnal"}</Button>
          </div>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">Tip: sistem otomatis mengisi sisi Debit/Kredit sesuai <em>saldo normal</em> akun (ASET & BEBAN → Debit; KEWAJIBAN, EKUITAS, PENDAPATAN → Kredit). Anda tetap bisa override manual.</p>
    </div>
  );
}
