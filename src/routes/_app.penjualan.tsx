import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, ArrowLeft, ShoppingCart } from "lucide-react";
import { formatRp, todayISO, formatDate } from "@/lib/format";
import { fetchTradeAccounts, fetchKasAccounts, generateDocNumber, reduceStock, postJournal } from "@/lib/trade-utils";
import { useBusinessUnit } from "@/lib/unit-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/penjualan")({ component: PenjualanPage });

type Item = { id: string; nama: string; kode: string; satuan: string | null; stok: number; harga_perolehan: number; harga_jual_default: number };
type Line = { item_id: string; qty: number; harga_jual: number };
type SO = { id: string; nomor_so: string; tanggal: string; pelanggan: string | null; total: number; metode_bayar: string };

function PenjualanPage() {
  const [view, setView] = useState<"list" | "new">("list");
  const [list, setList] = useState<SO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("sales_orders").select("*").order("tanggal", { ascending: false }).limit(100);
    setList((data as SO[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (view === "new") return <PenjualanNew onBack={() => { setView("list"); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Penjualan</h1>
          <p className="text-sm text-muted-foreground">Penjualan barang dagang — otomatis buat jurnal Penjualan + HPP</p>
        </div>
        <Button onClick={() => setView("new")}><Plus className="h-4 w-4" /> Penjualan Baru</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nomor</TableHead><TableHead>Tanggal</TableHead><TableHead>Pelanggan</TableHead>
              <TableHead>Metode</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada penjualan.</TableCell></TableRow>}
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.nomor_so}</TableCell>
                  <TableCell>{formatDate(s.tanggal)}</TableCell>
                  <TableCell>{s.pelanggan || "-"}</TableCell>
                  <TableCell className="capitalize">{s.metode_bayar}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function PenjualanNew({ onBack }: { onBack: () => void }) {
  const { resolveWriteUnitId } = useBusinessUnit();
  const [items, setItems] = useState<Item[]>([]);
  const [tanggal, setTanggal] = useState(todayISO());
  const [pelanggan, setPelanggan] = useState("");
  const [metode, setMetode] = useState<"tunai" | "piutang">("tunai");
  const [kasAccounts, setKasAccounts] = useState<{ id: string; kode_akun: string; nama_akun: string }[]>([]);
  const [kasId, setKasId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ item_id: "", qty: 1, harga_jual: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("inventory_items").select("id,nama,kode,satuan,stok,harga_perolehan,harga_jual_default")
      .eq("tipe_barang", "dagangan").gt("stok", 0).order("nama")
      .then(({ data }) => setItems((data as Item[]) ?? []));
    fetchKasAccounts().then((ks) => { setKasAccounts(ks); if (ks.length) setKasId(ks[0].id); });
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + l.qty * l.harga_jual, 0), [lines]);
  const totalHpp = useMemo(() => lines.reduce((s, l) => {
    const it = items.find((x) => x.id === l.item_id);
    return s + (l.qty * (Number(it?.harga_perolehan) || 0));
  }, 0), [lines, items]);

  const setLine = (i: number, p: Partial<Line>) => setLines(lines.map((l, idx) => idx === i ? { ...l, ...p } : l));
  const onItemChange = (i: number, itemId: string) => {
    const it = items.find((x) => x.id === itemId);
    setLine(i, { item_id: itemId, harga_jual: it ? Number(it.harga_jual_default) || 0 : 0 });
  };

  const save = async () => {
    const valid = lines.filter((l) => l.item_id && l.qty > 0 && l.harga_jual > 0);
    if (valid.length === 0) return toast.error("Tambah minimal 1 barang");
    if (metode === "tunai" && !kasId) return toast.error("Pilih akun Kas/Bank");
    // validasi stok
    for (const l of valid) {
      const it = items.find((x) => x.id === l.item_id);
      if (!it || Number(it.stok) < l.qty) return toast.error(`Stok ${it?.nama ?? "barang"} tidak cukup (sisa ${it?.stok ?? 0})`);
    }
    const unitId = resolveWriteUnitId();
    if (!unitId) return toast.error("Unit usaha belum dipilih");

    setSaving(true);
    try {
      const acc = await fetchTradeAccounts();
      if (!acc.penjualan || !acc.hpp || !acc.persediaan) throw new Error("Akun perdagangan belum lengkap");

      // 1. Kurangi stok & hitung HPP per baris
      const itemsWithHpp: { l: Line; hpp: number }[] = [];
      for (const l of valid) {
        const hpp = await reduceStock(l.item_id, l.qty, l.harga_jual, tanggal, `Penjualan`);
        itemsWithHpp.push({ l, hpp });
      }
      const totalSale = valid.reduce((s, l) => s + l.qty * l.harga_jual, 0);
      const totalCogs = itemsWithHpp.reduce((s, x) => s + x.l.qty * x.hpp, 0);

      // 2. Akun lawan: kas atau piutang
      let lawanId = kasId;
      if (metode === "piutang") {
        // cari akun Piutang Usaha standar 1.1.03.01 (sesuai COA seed)
        const { data: piutang } = await supabase.from("accounts").select("id").eq("kode_akun", "1.1.03.01").maybeSingle();
        if (!piutang) throw new Error("Akun Piutang Usaha (1.1.03.01) belum ada di Bagan Akun");
        lawanId = piutang.id;
      }

      // 3. Posting jurnal Penjualan + HPP (4 baris, single jurnal balance)
      const journalId = await postJournal({
        tanggal,
        keterangan: `Penjualan barang dagang${pelanggan ? ` ke ${pelanggan}` : ""}`,
        business_unit_id: unitId,
        source: "sales_order",
        lines: [
          { account_id: lawanId, debit: totalSale, kredit: 0, keterangan: metode === "tunai" ? "Kas/Bank" : "Piutang" },
          { account_id: acc.penjualan.id, debit: 0, kredit: totalSale, keterangan: "Pendapatan penjualan" },
          { account_id: acc.hpp.id, debit: totalCogs, kredit: 0, keterangan: "HPP" },
          { account_id: acc.persediaan.id, debit: 0, kredit: totalCogs, keterangan: "Pengurangan persediaan" },
        ],
      });

      // 4. Insert SO + items
      const nomor = await generateDocNumber("SO", "sales_orders", "nomor_so", tanggal);
      const { data: so, error } = await supabase.from("sales_orders").insert({
        nomor_so: nomor, tanggal, pelanggan: pelanggan || null, metode_bayar: metode,
        kas_account_id: metode === "tunai" ? kasId : null,
        total: totalSale, total_hpp: totalCogs, journal_id: journalId, business_unit_id: unitId,
      }).select("id").single();
      if (error) throw error;
      const payload = itemsWithHpp.map((x) => ({
        so_id: so.id, item_id: x.l.item_id, qty: x.l.qty, harga_jual: x.l.harga_jual,
        hpp_per_unit: x.hpp, subtotal: x.l.qty * x.l.harga_jual,
      }));
      await supabase.from("sales_order_items").insert(payload);

      // 5. Jika piutang → buat record piutang
      if (metode === "piutang") {
        await supabase.from("receivables").insert({
          tanggal, nama_debitur: pelanggan || "Pelanggan", jumlah: totalSale,
          keterangan: `Penjualan ${nomor}`, status: "lancar", business_unit_id: unitId,
        });
      }

      toast.success(`Penjualan ${nomor} tercatat`);
      onBack();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Penjualan Baru</h1>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div><Label>Tanggal</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
          <div><Label>Pelanggan</Label><Input value={pelanggan} onChange={(e) => setPelanggan(e.target.value)} placeholder="Nama pelanggan (opsional)" /></div>
          <div><Label>Metode Bayar</Label>
            <Select value={metode} onValueChange={(v) => setMetode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="tunai">Tunai</SelectItem><SelectItem value="piutang">Piutang</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        {metode === "tunai" && (
          <div><Label>Akun Kas/Bank</Label>
            <Select value={kasId} onValueChange={setKasId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{kasAccounts.map((k) => <SelectItem key={k.id} value={k.id}>{k.kode_akun} — {k.nama_akun}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Daftar Barang</Label>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-[40%]">Barang</TableHead><TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">HPP</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {lines.map((l, i) => {
                  const it = items.find((x) => x.id === l.item_id);
                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <Select value={l.item_id} onValueChange={(v) => onItemChange(i, v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih barang..." /></SelectTrigger>
                          <SelectContent>{items.map((x) => <SelectItem key={x.id} value={x.id}>{x.kode} — {x.nama} (stok: {x.stok})</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="text-right" value={l.qty} onChange={(e) => setLine(i, { qty: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={l.harga_jual} onChange={(e) => setLine(i, { harga_jual: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="text-right font-mono">{formatRp(l.qty * l.harga_jual)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{formatRp(l.qty * (Number(it?.harga_perolehan) || 0))}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { item_id: "", qty: 1, harga_jual: 0 }])}><Plus className="h-4 w-4" /> Tambah baris</Button>
        </div>

        <div className="rounded-md border bg-muted/20 p-3 text-xs space-y-1">
          <div className="font-semibold mb-1">Preview Jurnal Otomatis:</div>
          <div>Dr. {metode === "tunai" ? "Kas/Bank" : "Piutang Usaha"} — {formatRp(total)}</div>
          <div className="ml-4">Cr. Pendapatan Penjualan — {formatRp(total)}</div>
          <div>Dr. HPP — {formatRp(totalHpp)}</div>
          <div className="ml-4">Cr. Persediaan Barang Dagang — {formatRp(totalHpp)}</div>
          <div className="pt-1 border-t mt-2">Laba kotor: <b className="text-emerald-600">{formatRp(total - totalHpp)}</b></div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-lg">Total: <span className="font-bold font-mono text-primary">{formatRp(total)}</span></div>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan & Posting</Button>
        </div>
      </Card>
    </div>
  );
}
