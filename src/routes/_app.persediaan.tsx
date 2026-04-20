import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRp, formatNum, formatDate, todayISO } from "@/lib/format";
import { Plus, Loader2, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/persediaan")({ component: PersediaanPage });

type Item = { id: string; kode: string; nama: string; satuan: string | null; stok: number; harga_perolehan: number; harga_jual: number };
type Mov = { id: string; item_id: string; tanggal: string; tipe: string; qty: number; harga: number; keterangan: string | null };

function PersediaanPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState(false);
  const [openMov, setOpenMov] = useState(false);
  const [itemForm, setItemForm] = useState({ kode: "", nama: "", satuan: "pcs", harga_perolehan: "0", harga_jual: "0" });
  const [movForm, setMovForm] = useState({ item_id: "", tanggal: todayISO(), tipe: "masuk", qty: "0", harga: "0", keterangan: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: it }, { data: mv }] = await Promise.all([
      supabase.from("inventory_items").select("*").order("kode"),
      supabase.from("inventory_movements").select("*").order("tanggal", { ascending: false }).limit(200),
    ]);
    setItems((it as Item[]) ?? []);
    setMovs((mv as Mov[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveItem = async () => {
    if (!itemForm.kode || !itemForm.nama) return toast.error("Kode & nama wajib");
    const { error } = await supabase.from("inventory_items").insert({
      kode: itemForm.kode, nama: itemForm.nama, satuan: itemForm.satuan,
      harga_perolehan: parseFloat(itemForm.harga_perolehan) || 0,
      harga_jual: parseFloat(itemForm.harga_jual) || 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Item ditambahkan");
    setOpenItem(false);
    setItemForm({ kode: "", nama: "", satuan: "pcs", harga_perolehan: "0", harga_jual: "0" });
    load();
  };

  const saveMov = async () => {
    if (!movForm.item_id) return toast.error("Pilih item");
    const qty = parseFloat(movForm.qty) || 0;
    if (qty <= 0) return toast.error("Qty harus > 0");
    const item = items.find((i) => i.id === movForm.item_id);
    if (!item) return;
    const delta = movForm.tipe === "masuk" ? qty : -qty;
    const newStok = Number(item.stok) + delta;
    if (newStok < 0) return toast.error("Stok tidak cukup");
    const harga = parseFloat(movForm.harga) || (movForm.tipe === "masuk" ? Number(item.harga_perolehan) : Number(item.harga_jual));
    const { error: e1 } = await supabase.from("inventory_movements").insert({
      item_id: movForm.item_id, tanggal: movForm.tanggal, tipe: movForm.tipe, qty, harga, keterangan: movForm.keterangan || null,
    });
    if (e1) return toast.error(e1.message);
    const updates: { stok: number; harga_perolehan?: number } = { stok: newStok };
    if (movForm.tipe === "masuk") updates.harga_perolehan = harga; // update HPP terakhir (sederhana)
    await supabase.from("inventory_items").update(updates).eq("id", movForm.item_id);
    toast.success("Mutasi tercatat");
    setOpenMov(false);
    setMovForm({ item_id: "", tanggal: todayISO(), tipe: "masuk", qty: "0", harga: "0", keterangan: "" });
    load();
  };

  const totalNilai = useMemo(() =>
    items.reduce((s, i) => s + Number(i.stok) * Math.min(Number(i.harga_perolehan), Number(i.harga_jual) || Number(i.harga_perolehan)), 0),
  [items]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Persediaan</h1>
          <p className="text-sm text-muted-foreground">Penilaian: terendah antara harga perolehan & harga jual</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openMov} onOpenChange={setOpenMov}>
            <DialogTrigger asChild><Button variant="outline" disabled={items.length === 0}><ArrowDownUp className="h-4 w-4" /> Mutasi</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Mutasi Persediaan</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Item</Label>
                  <Select value={movForm.item_id} onValueChange={(v) => setMovForm({ ...movForm, item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih…" /></SelectTrigger>
                    <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.kode} — {i.nama} (stok: {formatNum(i.stok)})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tanggal</Label><Input type="date" value={movForm.tanggal} onChange={(e) => setMovForm({ ...movForm, tanggal: e.target.value })} /></div>
                  <div><Label>Tipe</Label>
                    <Select value={movForm.tipe} onValueChange={(v) => setMovForm({ ...movForm, tipe: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="masuk">Masuk</SelectItem><SelectItem value="keluar">Keluar</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Qty</Label><Input type="number" value={movForm.qty} onChange={(e) => setMovForm({ ...movForm, qty: e.target.value })} /></div>
                  <div><Label>Harga satuan</Label><Input type="number" value={movForm.harga} onChange={(e) => setMovForm({ ...movForm, harga: e.target.value })} /></div>
                </div>
                <div><Label>Keterangan</Label><Input value={movForm.keterangan} onChange={(e) => setMovForm({ ...movForm, keterangan: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={saveMov}>Catat</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={openItem} onOpenChange={setOpenItem}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Tambah Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Item Persediaan</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Kode *</Label><Input value={itemForm.kode} onChange={(e) => setItemForm({ ...itemForm, kode: e.target.value })} /></div>
                  <div><Label>Satuan</Label><Input value={itemForm.satuan} onChange={(e) => setItemForm({ ...itemForm, satuan: e.target.value })} /></div>
                </div>
                <div><Label>Nama *</Label><Input value={itemForm.nama} onChange={(e) => setItemForm({ ...itemForm, nama: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Harga perolehan</Label><Input type="number" value={itemForm.harga_perolehan} onChange={(e) => setItemForm({ ...itemForm, harga_perolehan: e.target.value })} /></div>
                  <div><Label>Harga jual</Label><Input type="number" value={itemForm.harga_jual} onChange={(e) => setItemForm({ ...itemForm, harga_jual: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={saveItem}>Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Total Nilai Persediaan (terendah)</div>
        <div className="text-2xl font-bold font-mono text-primary">{formatRp(totalNilai)}</div>
      </Card>

      <Tabs defaultValue="stok">
        <TabsList><TabsTrigger value="stok">Stok</TabsTrigger><TabsTrigger value="mutasi">Mutasi</TabsTrigger></TabsList>
        <TabsContent value="stok">
          <Card className="p-0 overflow-hidden">
            {loading ? <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Stok</TableHead><TableHead className="text-right">H. Perolehan</TableHead>
                  <TableHead className="text-right">H. Jual</TableHead><TableHead className="text-right">Nilai (terendah)</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada item.</TableCell></TableRow>}
                  {items.map((i) => {
                    const hp = Number(i.harga_perolehan), hj = Number(i.harga_jual) || hp;
                    const nilai = Number(i.stok) * Math.min(hp, hj);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.kode}</TableCell>
                        <TableCell className="font-medium">{i.nama}</TableCell>
                        <TableCell>{i.satuan || "-"}</TableCell>
                        <TableCell className="text-right font-mono">{formatNum(i.stok)}</TableCell>
                        <TableCell className="text-right font-mono">{formatRp(hp)}</TableCell>
                        <TableCell className="text-right font-mono">{formatRp(hj)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatRp(nilai)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="mutasi">
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tanggal</TableHead><TableHead>Item</TableHead><TableHead>Tipe</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga</TableHead><TableHead>Keterangan</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {movs.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada mutasi.</TableCell></TableRow>}
                {movs.map((m) => {
                  const it = items.find((x) => x.id === m.item_id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.tanggal)}</TableCell>
                      <TableCell>{it ? `${it.kode} — ${it.nama}` : "-"}</TableCell>
                      <TableCell className={m.tipe === "masuk" ? "text-emerald-600" : "text-orange-600"}>{m.tipe}</TableCell>
                      <TableCell className="text-right font-mono">{formatNum(m.qty)}</TableCell>
                      <TableCell className="text-right font-mono">{formatRp(m.harga)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.keterangan || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
