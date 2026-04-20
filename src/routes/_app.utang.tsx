import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRp, formatDate, todayISO } from "@/lib/format";
import { Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/utang")({ component: UtangPage });

type Pay = {
  id: string; nama_kreditur: string; tanggal: string; jatuh_tempo: string | null;
  jumlah: number; klasifikasi: string; is_paid: boolean; keterangan: string | null;
};

function UtangPage() {
  const [items, setItems] = useState<Pay[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nama_kreditur: "", tanggal: todayISO(), jatuh_tempo: "", jumlah: "0", klasifikasi: "jangka_pendek", keterangan: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("payables").select("*").order("tanggal", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Pay[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nama_kreditur.trim()) return toast.error("Nama kreditur wajib");
    const jumlah = parseFloat(form.jumlah) || 0;
    if (jumlah <= 0) return toast.error("Jumlah harus > 0");
    const { error } = await supabase.from("payables").insert({
      nama_kreditur: form.nama_kreditur, tanggal: form.tanggal,
      jatuh_tempo: form.jatuh_tempo || null, jumlah,
      klasifikasi: form.klasifikasi, keterangan: form.keterangan || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Utang ditambahkan");
    setOpen(false);
    setForm({ nama_kreditur: "", tanggal: todayISO(), jatuh_tempo: "", jumlah: "0", klasifikasi: "jangka_pendek", keterangan: "" });
    load();
  };

  const lunasi = async (id: string) => {
    const { error } = await supabase.from("payables").update({ is_paid: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ditandai lunas");
    load();
  };

  const totals = useMemo(() => {
    const aktif = items.filter((x) => !x.is_paid);
    return {
      total: aktif.reduce((s, x) => s + Number(x.jumlah), 0),
      pendek: aktif.filter((x) => x.klasifikasi === "jangka_pendek").reduce((s, x) => s + Number(x.jumlah), 0),
      panjang: aktif.filter((x) => x.klasifikasi === "jangka_panjang").reduce((s, x) => s + Number(x.jumlah), 0),
      lunas: items.filter((x) => x.is_paid).reduce((s, x) => s + Number(x.jumlah), 0),
    };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Utang</h1>
          <p className="text-sm text-muted-foreground">Klasifikasi jangka pendek/panjang</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Tambah Utang</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Utang</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nama kreditur *</Label><Input value={form.nama_kreditur} onChange={(e) => setForm({ ...form, nama_kreditur: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
                <div><Label>Jatuh tempo</Label><Input type="date" value={form.jatuh_tempo} onChange={(e) => setForm({ ...form, jatuh_tempo: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Jumlah</Label><Input type="number" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} /></div>
                <div>
                  <Label>Klasifikasi</Label>
                  <Select value={form.klasifikasi} onValueChange={(v) => setForm({ ...form, klasifikasi: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jangka_pendek">Jangka Pendek (≤1 thn)</SelectItem>
                      <SelectItem value="jangka_panjang">Jangka Panjang (&gt;1 thn)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Keterangan</Label><Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Simpan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="Total Utang Aktif" value={totals.total} accent />
        <Stat label="Jangka Pendek" value={totals.pendek} />
        <Stat label="Jangka Panjang" value={totals.panjang} />
        <Stat label="Sudah Lunas" value={totals.lunas} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Kreditur</TableHead><TableHead>Tanggal</TableHead><TableHead>Jatuh Tempo</TableHead>
              <TableHead>Klasifikasi</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada utang.</TableCell></TableRow>}
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nama_kreditur}</TableCell>
                  <TableCell>{formatDate(p.tanggal)}</TableCell>
                  <TableCell>{p.jatuh_tempo ? formatDate(p.jatuh_tempo) : "-"}</TableCell>
                  <TableCell><Badge variant="outline">{p.klasifikasi.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{formatRp(p.jumlah)}</TableCell>
                  <TableCell>{p.is_paid ? <Badge className="bg-emerald-500/15 text-emerald-700" variant="secondary">Lunas</Badge> : <Badge variant="secondary">Aktif</Badge>}</TableCell>
                  <TableCell>{!p.is_paid && <Button size="sm" variant="outline" onClick={() => lunasi(p.id)}><Check className="h-3 w-3" /> Lunasi</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold font-mono ${accent ? "text-primary" : ""}`}>{formatRp(value)}</div>
    </Card>
  );
}
