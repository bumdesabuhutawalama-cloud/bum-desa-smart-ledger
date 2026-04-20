import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRp, formatDate, todayISO } from "@/lib/format";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/piutang")({ component: PiutangPage });

type Status = "lancar" | "kurang_lancar" | "diragukan" | "macet";
type Recv = {
  id: string; nama_debitur: string; tanggal: string; jatuh_tempo: string | null;
  jumlah: number; penyisihan: number; status: Status; keterangan: string | null;
};

const PENYISIHAN_PCT: Record<Status, number> = { lancar: 0.005, kurang_lancar: 0.10, diragukan: 0.50, macet: 1.0 };

function classify(jatuhTempo: string | null): Status {
  if (!jatuhTempo) return "lancar";
  const days = Math.floor((Date.now() - new Date(jatuhTempo).getTime()) / 86400000);
  if (days <= 0) return "lancar";
  if (days <= 90) return "kurang_lancar";
  if (days <= 180) return "diragukan";
  return "macet";
}

function PiutangPage() {
  const [items, setItems] = useState<Recv[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nama_debitur: "", tanggal: todayISO(), jatuh_tempo: "", jumlah: "0", keterangan: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("receivables").select("*").order("tanggal", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Recv[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nama_debitur.trim()) return toast.error("Nama debitur wajib");
    const jumlah = parseFloat(form.jumlah) || 0;
    if (jumlah <= 0) return toast.error("Jumlah harus > 0");
    const status = classify(form.jatuh_tempo || null);
    const penyisihan = jumlah * PENYISIHAN_PCT[status];
    const { error } = await supabase.from("receivables").insert({
      nama_debitur: form.nama_debitur, tanggal: form.tanggal,
      jatuh_tempo: form.jatuh_tempo || null, jumlah, penyisihan, status,
      keterangan: form.keterangan || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Piutang ditambahkan");
    setOpen(false);
    setForm({ nama_debitur: "", tanggal: todayISO(), jatuh_tempo: "", jumlah: "0", keterangan: "" });
    load();
  };

  const reklasifikasi = async () => {
    let updated = 0;
    for (const r of items) {
      const newStatus = classify(r.jatuh_tempo);
      const newPenyisihan = Number(r.jumlah) * PENYISIHAN_PCT[newStatus];
      if (newStatus !== r.status || Math.abs(newPenyisihan - Number(r.penyisihan)) > 0.5) {
        await supabase.from("receivables").update({ status: newStatus, penyisihan: newPenyisihan }).eq("id", r.id);
        updated++;
      }
    }
    toast.success(`${updated} piutang direklasifikasi`);
    load();
  };

  const totals = useMemo(() => {
    return items.reduce((acc, r) => {
      acc.total += Number(r.jumlah);
      acc.penyisihan += Number(r.penyisihan);
      acc[r.status] += Number(r.jumlah);
      return acc;
    }, { total: 0, penyisihan: 0, lancar: 0, kurang_lancar: 0, diragukan: 0, macet: 0 } as Record<string, number>);
  }, [items]);

  const badge = (s: Status) => {
    const m: Record<Status, string> = { lancar: "bg-emerald-500/15 text-emerald-700", kurang_lancar: "bg-amber-500/15 text-amber-700", diragukan: "bg-orange-500/15 text-orange-700", macet: "bg-destructive/15 text-destructive" };
    return <Badge variant="secondary" className={m[s]}>{s.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Piutang</h1>
          <p className="text-sm text-muted-foreground">Klasifikasi otomatis & penyisihan kerugian piutang</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reklasifikasi}>Reklasifikasi Otomatis</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Tambah Piutang</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Piutang</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nama debitur *</Label><Input value={form.nama_debitur} onChange={(e) => setForm({ ...form, nama_debitur: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
                  <div><Label>Jatuh tempo</Label><Input type="date" value={form.jatuh_tempo} onChange={(e) => setForm({ ...form, jatuh_tempo: e.target.value })} /></div>
                </div>
                <div><Label>Jumlah</Label><Input type="number" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} /></div>
                <div><Label>Keterangan</Label><Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <StatCard label="Total Piutang" value={totals.total} />
        <StatCard label="Penyisihan" value={totals.penyisihan} />
        <StatCard label="Nilai Realisasi" value={totals.total - totals.penyisihan} accent />
        <StatCard label="Macet" value={totals.macet} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Debitur</TableHead><TableHead>Tanggal</TableHead><TableHead>Jatuh Tempo</TableHead>
              <TableHead className="text-right">Jumlah</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Penyisihan</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada piutang.</TableCell></TableRow>}
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nama_debitur}</TableCell>
                  <TableCell>{formatDate(r.tanggal)}</TableCell>
                  <TableCell>{r.jatuh_tempo ? formatDate(r.jatuh_tempo) : "-"}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(r.jumlah)}</TableCell>
                  <TableCell>{badge(r.status)}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(r.penyisihan)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold font-mono ${accent ? "text-primary" : ""}`}>{formatRp(value)}</div>
    </Card>
  );
}
