import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRp, formatDate, todayISO } from "@/lib/format";
import { Plus, Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aset")({ component: AsetPage });

type Asset = {
  id: string;
  nama: string;
  kategori: string | null;
  tanggal_perolehan: string;
  harga_perolehan: number;
  nilai_residu: number;
  masa_manfaat_bulan: number;
  akumulasi_penyusutan: number;
  is_active: boolean;
};

function AsetPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({
    nama: "", kategori: "", tanggal_perolehan: todayISO(),
    harga_perolehan: "0", nilai_residu: "0", masa_manfaat_bulan: "60",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("assets").select("*").order("tanggal_perolehan", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Asset[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nama.trim()) return toast.error("Nama aset wajib diisi");
    const harga = parseFloat(form.harga_perolehan) || 0;
    const residu = parseFloat(form.nilai_residu) || 0;
    const masa = parseInt(form.masa_manfaat_bulan) || 0;
    if (harga <= 0) return toast.error("Harga perolehan harus > 0");
    if (masa <= 0) return toast.error("Masa manfaat harus > 0");
    if (residu >= harga) return toast.error("Nilai residu harus < harga perolehan");

    const { error } = await supabase.from("assets").insert({
      nama: form.nama, kategori: form.kategori || null,
      tanggal_perolehan: form.tanggal_perolehan,
      harga_perolehan: harga, nilai_residu: residu,
      masa_manfaat_bulan: masa,
    });
    if (error) return toast.error(error.message);
    toast.success("Aset ditambahkan");
    setOpen(false);
    setForm({ nama: "", kategori: "", tanggal_perolehan: todayISO(), harga_perolehan: "0", nilai_residu: "0", masa_manfaat_bulan: "60" });
    load();
  };

  const postPenyusutanBulanIni = async () => {
    setPosting(true);
    try {
      const now = new Date();
      const ymKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      // cek apakah sudah pernah posting bulan ini
      const { data: existing } = await supabase
        .from("journals")
        .select("id")
        .like("nomor_jurnal", `DEPR-${ymKey}-%`)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.warning("Penyusutan bulan ini sudah dijurnal sebelumnya");
        return;
      }
      // cari akun beban penyusutan & akumulasi penyusutan default
      const { data: accs } = await supabase
        .from("accounts")
        .select("id,kode_akun,nama_akun")
        .or("nama_akun.ilike.%penyusutan%,nama_akun.ilike.%akumulasi%");
      const bebanAcc = accs?.find((a) => /beban|biaya/i.test(a.nama_akun) && /penyusutan/i.test(a.nama_akun));
      const akumAcc = accs?.find((a) => /akumulasi/i.test(a.nama_akun));
      if (!bebanAcc || !akumAcc) {
        toast.error("Akun 'Beban Penyusutan' atau 'Akumulasi Penyusutan' belum tersedia di Bagan Akun");
        return;
      }

      let totalDepr = 0;
      const updates: Array<{ id: string; akumulasi_penyusutan: number }> = [];
      for (const a of items.filter((x) => x.is_active)) {
        const dasar = Number(a.harga_perolehan) - Number(a.nilai_residu);
        const perBulan = dasar / a.masa_manfaat_bulan;
        const sisa = dasar - Number(a.akumulasi_penyusutan);
        const depr = Math.min(perBulan, Math.max(sisa, 0));
        if (depr <= 0) continue;
        totalDepr += depr;
        updates.push({ id: a.id, akumulasi_penyusutan: Number(a.akumulasi_penyusutan) + depr });
      }
      if (totalDepr <= 0) {
        toast.warning("Tidak ada aset yang masih perlu disusutkan");
        return;
      }

      const nomor = `DEPR-${ymKey}-${Date.now().toString().slice(-4)}`;
      const tgl = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10); // akhir bulan
      const { data: j, error: ej } = await supabase
        .from("journals")
        .insert({ tanggal: tgl, nomor_jurnal: nomor, keterangan: `Penyusutan aset tetap ${ymKey}`, source: "depreciation", status: "posted" })
        .select("id").single();
      if (ej || !j) throw ej || new Error("Gagal buat jurnal");

      const { error: el } = await supabase.from("journal_lines").insert([
        { journal_id: j.id, account_id: bebanAcc.id, debit: totalDepr, kredit: 0, line_order: 1 },
        { journal_id: j.id, account_id: akumAcc.id, debit: 0, kredit: totalDepr, line_order: 2 },
      ]);
      if (el) {
        await supabase.from("journals").delete().eq("id", j.id);
        throw el;
      }

      // update akumulasi
      for (const u of updates) {
        await supabase.from("assets").update({ akumulasi_penyusutan: u.akumulasi_penyusutan }).eq("id", u.id);
      }
      toast.success(`Penyusutan ${formatRp(totalDepr)} berhasil dijurnal`);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal";
      toast.error(msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aset Tetap</h1>
          <p className="text-sm text-muted-foreground">Penyusutan garis lurus + auto-jurnal bulanan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={postPenyusutanBulanIni} disabled={posting || items.length === 0}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Posting Penyusutan Bulan Ini
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Tambah Aset</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Aset Tetap</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nama aset *</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
                <div><Label>Kategori</Label><Input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="Kendaraan, Mesin, Bangunan…" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tanggal perolehan</Label><Input type="date" value={form.tanggal_perolehan} onChange={(e) => setForm({ ...form, tanggal_perolehan: e.target.value })} /></div>
                  <div><Label>Masa manfaat (bulan)</Label><Input type="number" value={form.masa_manfaat_bulan} onChange={(e) => setForm({ ...form, masa_manfaat_bulan: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Harga perolehan</Label><Input type="number" value={form.harga_perolehan} onChange={(e) => setForm({ ...form, harga_perolehan: e.target.value })} /></div>
                  <div><Label>Nilai residu</Label><Input type="number" value={form.nilai_residu} onChange={(e) => setForm({ ...form, nilai_residu: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={save}>Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tgl Perolehan</TableHead>
                <TableHead className="text-right">Harga Perolehan</TableHead>
                <TableHead className="text-right">Akum. Penyusutan</TableHead>
                <TableHead className="text-right">Nilai Buku</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada aset.</TableCell></TableRow>}
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nama}</TableCell>
                  <TableCell>{a.kategori || "-"}</TableCell>
                  <TableCell>{formatDate(a.tanggal_perolehan)}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(a.harga_perolehan)}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(a.akumulasi_penyusutan)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatRp(Number(a.harga_perolehan) - Number(a.akumulasi_penyusutan))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
