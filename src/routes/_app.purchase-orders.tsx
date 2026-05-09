import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, ArrowLeft, FileText, PackageCheck } from "lucide-react";
import { formatRp, todayISO, formatDate } from "@/lib/format";
import { generateDocNumber } from "@/lib/trade-utils";
import { useBusinessUnit } from "@/lib/unit-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/purchase-orders")({ component: POPage });

type PO = { id: string; nomor_po: string; tanggal: string; supplier_id: string; total: number; status: string; catatan: string | null };
type Supplier = { id: string; nama_supplier: string };
type Item = { id: string; nama: string; kode: string; satuan: string | null; harga_beli_default: number };
type Line = { item_id: string; qty: number; harga: number };

function POPage() {
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [list, setList] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("tanggal", { ascending: false }).limit(100),
      supabase.from("suppliers").select("id,nama_supplier").eq("is_active", true).order("nama_supplier"),
    ]);
    setList((p as PO[]) ?? []);
    setSuppliers((s as Supplier[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (view === "new") return <PONew suppliers={suppliers} onBack={() => { setView("list"); load(); }} onCreated={(id) => { setSelectedId(id); setView("detail"); load(); }} />;
  if (view === "detail" && selectedId) return <PODetail id={selectedId} onBack={() => { setView("list"); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchase Order</h1>
          <p className="text-sm text-muted-foreground">Pemesanan barang ke supplier (belum membuat jurnal)</p>
        </div>
        <Button onClick={() => setView("new")}><Plus className="h-4 w-4" /> Buat PO</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nomor</TableHead><TableHead>Tanggal</TableHead><TableHead>Supplier</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada PO.</TableCell></TableRow>}
              {list.map((p) => {
                const sup = suppliers.find((s) => s.id === p.supplier_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.nomor_po}</TableCell>
                    <TableCell>{formatDate(p.tanggal)}</TableCell>
                    <TableCell>{sup?.nama_supplier ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(p.total)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedId(p.id); setView("detail"); }}>Detail</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    dikirim: "bg-blue-500/10 text-blue-600",
    selesai: "bg-emerald-500/10 text-emerald-600",
    batal: "bg-destructive/10 text-destructive",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

// ===== NEW PO =====
function PONew({ suppliers, onBack, onCreated }: { suppliers: Supplier[]; onBack: () => void; onCreated: (id: string) => void }) {
  const { resolveWriteUnitId } = useBusinessUnit();
  const [items, setItems] = useState<Item[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [tanggal, setTanggal] = useState(todayISO());
  const [catatan, setCatatan] = useState("");
  const [lines, setLines] = useState<Line[]>([{ item_id: "", qty: 1, harga: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("inventory_items").select("id,nama,kode,satuan,harga_beli_default").eq("tipe_barang", "dagangan").order("nama")
      .then(({ data }) => setItems((data as Item[]) ?? []));
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + (l.qty || 0) * (l.harga || 0), 0), [lines]);

  const setLine = (i: number, p: Partial<Line>) => setLines(lines.map((l, idx) => idx === i ? { ...l, ...p } : l));
  const onItemChange = (i: number, itemId: string) => {
    const it = items.find((x) => x.id === itemId);
    setLine(i, { item_id: itemId, harga: it ? Number(it.harga_beli_default) || 0 : 0 });
  };

  const save = async () => {
    if (!supplierId) return toast.error("Pilih supplier");
    const valid = lines.filter((l) => l.item_id && l.qty > 0);
    if (valid.length === 0) return toast.error("Tambah minimal 1 barang");
    const unitId = resolveWriteUnitId();
    if (!unitId) return toast.error("Unit usaha belum dipilih");
    setSaving(true);
    try {
      const nomor = await generateDocNumber("PO", "purchase_orders", "nomor_po", tanggal);
      const { data: po, error } = await supabase.from("purchase_orders").insert({
        nomor_po: nomor, tanggal, supplier_id: supplierId, business_unit_id: unitId,
        total, status: "dikirim", catatan: catatan || null,
      }).select("id").single();
      if (error) throw error;
      const payload = valid.map((l) => ({ po_id: po.id, item_id: l.item_id, qty: l.qty, harga: l.harga, subtotal: l.qty * l.harga }));
      const { error: e2 } = await supabase.from("purchase_order_items").insert(payload);
      if (e2) { await supabase.from("purchase_orders").delete().eq("id", po.id); throw e2; }
      toast.success(`PO ${nomor} dibuat`);
      onCreated(po.id);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Buat Purchase Order</h1>
      </div>
      <Card className="p-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Tanggal</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
          <div><Label>Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Pilih supplier..." /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama_supplier}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Daftar Barang</Label>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-[45%]">Barang</TableHead><TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {lines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select value={l.item_id} onValueChange={(v) => onItemChange(i, v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih barang..." /></SelectTrigger>
                        <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.kode} — {it.nama}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" className="text-right" value={l.qty} onChange={(e) => setLine(i, { qty: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="text-right" value={l.harga} onChange={(e) => setLine(i, { harga: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right font-mono">{formatRp(l.qty * l.harga)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { item_id: "", qty: 1, harga: 0 }])}><Plus className="h-4 w-4" /> Tambah baris</Button>
        </div>

        <div><Label>Catatan</Label><Input value={catatan} onChange={(e) => setCatatan(e.target.value)} /></div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-lg">Total: <span className="font-bold font-mono text-primary">{formatRp(total)}</span></div>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan PO</Button>
        </div>
      </Card>
    </div>
  );
}

// ===== DETAIL =====
function PODetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [po, setPO] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [supplier, setSupplier] = useState<any>(null);
  const [allItems, setAllItems] = useState<Record<string, Item>>({});
  const [hasReceipt, setHasReceipt] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    const { data: p } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
    setPO(p);
    if (p?.supplier_id) {
      const { data: s } = await supabase.from("suppliers").select("*").eq("id", p.supplier_id).single();
      setSupplier(s);
    }
    const { data: it } = await supabase.from("purchase_order_items").select("*").eq("po_id", id);
    setItems(it ?? []);
    if (it && it.length) {
      const { data: invs } = await supabase.from("inventory_items").select("id,nama,kode,satuan,harga_beli_default")
        .in("id", it.map((x: any) => x.item_id));
      const m: Record<string, Item> = {};
      (invs ?? []).forEach((x: any) => (m[x.id] = x));
      setAllItems(m);
    }
    const { data: gr } = await supabase.from("goods_receipts").select("id").eq("po_id", id).limit(1);
    setHasReceipt((gr?.length ?? 0) > 0);
  };
  useEffect(() => { load(); }, [id]);

  if (!po) return <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const cetak = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildPOHtml(po, supplier, items, allItems));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">PO {po.nomor_po}</h1>
          <StatusBadge status={po.status} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cetak}><FileText className="h-4 w-4" /> Cetak PO</Button>
          {!hasReceipt && po.status !== "batal" && (
            <Button onClick={() => nav({ to: "/penerimaan/baru", search: { po: id } as any })}>
              <PackageCheck className="h-4 w-4" /> Terima Barang
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4 grid md:grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Tanggal:</span> {formatDate(po.tanggal)}</div>
        <div><span className="text-muted-foreground">Supplier:</span> {supplier?.nama_supplier}</div>
        <div><span className="text-muted-foreground">Alamat:</span> {supplier?.alamat || "-"}</div>
        <div><span className="text-muted-foreground">Telepon:</span> {supplier?.telepon || "-"}</div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Harga</TableHead><TableHead className="text-right">Subtotal</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((l) => {
              const it = allItems[l.item_id];
              return (
                <TableRow key={l.id}>
                  <TableCell>{it ? `${it.kode} — ${it.nama}` : l.item_id}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty} {it?.satuan ?? ""}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(l.harga)}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(l.subtotal)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow><TableCell colSpan={3} className="text-right font-semibold">Total</TableCell><TableCell className="text-right font-mono font-bold text-primary">{formatRp(po.total)}</TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>

      {hasReceipt && <div className="text-sm text-emerald-600">✔ Barang sudah diterima (BAST telah dibuat).</div>}
    </div>
  );
}

function buildPOHtml(po: any, supplier: any, items: any[], allItems: Record<string, Item>) {
  const rows = items.map((l) => {
    const it = allItems[l.item_id];
    return `<tr><td>${it?.kode ?? ""} — ${it?.nama ?? ""}</td><td style="text-align:right">${l.qty} ${it?.satuan ?? ""}</td><td style="text-align:right">${formatRp(l.harga)}</td><td style="text-align:right">${formatRp(l.subtotal)}</td></tr>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${po.nomor_po}</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}h1{text-align:center;margin:0 0 4px}h2{text-align:center;margin:0 0 24px;font-weight:normal;font-size:14px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #999;padding:6px 8px;font-size:12px}th{background:#eee;text-align:left}.info{margin-top:16px}.info div{margin:4px 0}.sign{margin-top:48px;display:flex;justify-content:space-between}.sign div{text-align:center;width:200px}.sign .line{margin-top:64px;border-top:1px solid #333}</style></head>
<body>
<h1>NOTA PESANAN BARANG</h1><h2>(PURCHASE ORDER)</h2>
<div class="info">
  <div><b>BADAN USAHA MILIK DESA (BUMDes)</b></div>
  <div>Telah melakukan pemesanan barang kepada:</div>
  <div style="margin-top:8px">Nama Perusahaan : <b>${supplier?.nama_supplier ?? "-"}</b></div>
  <div>Alamat : ${supplier?.alamat ?? "-"}</div>
  <div>Telepon : ${supplier?.telepon ?? "-"}</div>
  <div>Tanggal : ${formatDate(po.tanggal)}</div>
  <div>Nomor PO : <b>${po.nomor_po}</b></div>
</div>
<table><thead><tr><th>Barang</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
<tbody>${rows}<tr><td colspan="3" style="text-align:right"><b>TOTAL</b></td><td style="text-align:right"><b>${formatRp(po.total)}</b></td></tr></tbody></table>
<div style="margin-top:24px"><b>Ketentuan:</b>
<ol><li>Barang harus baru dan sesuai spesifikasi</li><li>Pengiriman maksimal 5 hari kerja</li><li>Faktur wajib disertakan saat pengiriman</li><li>Pembayaran melalui rekening resmi BUMDes</li></ol></div>
<div class="sign"><div>Pemesan,<div class="line">BUMDes</div></div><div>Penerima Pesanan,<div class="line">${supplier?.nama_supplier ?? ""}</div></div></div>
</body></html>`;
}
