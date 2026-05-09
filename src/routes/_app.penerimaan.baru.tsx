import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, FileText } from "lucide-react";
import { formatRp, todayISO, formatDate } from "@/lib/format";
import { fetchTradeAccounts, fetchKasAccounts, generateDocNumber, addStockMovingAvg, postJournal } from "@/lib/trade-utils";
import { useBusinessUnit } from "@/lib/unit-context";
import { toast } from "sonner";

const searchSchema = z.object({ po: z.string().optional() });

export const Route = createFileRoute("/_app/penerimaan/baru")({
  component: PenerimaanBaru,
  validateSearch: searchSchema,
});

function PenerimaanBaru() {
  const { po: poId } = useSearch({ from: "/_app/penerimaan/baru" });
  const nav = useNavigate();
  const { resolveWriteUnitId } = useBusinessUnit();
  const [po, setPO] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [poItems, setPOItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<Record<string, any>>({});
  const [tanggal, setTanggal] = useState(todayISO());
  const [metode, setMetode] = useState<"tunai" | "kredit">("tunai");
  const [kasAccounts, setKasAccounts] = useState<{ id: string; kode_akun: string; nama_akun: string }[]>([]);
  const [kasId, setKasId] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ id: string; nomor: string } | null>(null);

  useEffect(() => {
    if (!poId) return;
    (async () => {
      const { data: p } = await supabase.from("purchase_orders").select("*").eq("id", poId).single();
      if (!p) return;
      setPO(p);
      const { data: s } = await supabase.from("suppliers").select("*").eq("id", p.supplier_id).single();
      setSupplier(s);
      const { data: it } = await supabase.from("purchase_order_items").select("*").eq("po_id", poId);
      setPOItems(it ?? []);
      if (it && it.length) {
        const { data: invs } = await supabase.from("inventory_items").select("id,nama,kode,satuan").in("id", it.map((x: any) => x.item_id));
        const m: Record<string, any> = {};
        (invs ?? []).forEach((x: any) => (m[x.id] = x));
        setAllItems(m);
      }
      const { data: gr } = await supabase.from("goods_receipts").select("id, nomor_bast").eq("po_id", poId).limit(1);
      if (gr && gr.length) setDone({ id: gr[0].id, nomor: gr[0].nomor_bast });
      const ks = await fetchKasAccounts();
      setKasAccounts(ks);
      if (ks.length) setKasId(ks[0].id);
    })();
  }, [poId]);

  const total = useMemo(() => poItems.reduce((s, l) => s + Number(l.subtotal), 0), [poItems]);

  if (!poId) return <div className="p-6">PO tidak ditemukan. <Button variant="link" onClick={() => nav({ to: "/purchase-orders" })}>Kembali</Button></div>;
  if (!po) return <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const proses = async () => {
    if (metode === "tunai" && !kasId) return toast.error("Pilih akun Kas/Bank");
    const unitId = resolveWriteUnitId();
    if (!unitId) return toast.error("Unit usaha belum dipilih");
    setSaving(true);
    try {
      const tradeAcc = await fetchTradeAccounts();
      if (!tradeAcc.persediaan) throw new Error("Akun Persediaan Barang Dagang belum ada");
      if (metode === "kredit" && !tradeAcc.hutang) throw new Error("Akun Hutang Supplier belum ada");

      // 1. Update stok pakai moving average
      for (const l of poItems) {
        await addStockMovingAvg(l.item_id, Number(l.qty), Number(l.harga), tanggal, `BAST PO ${po.nomor_po}`);
      }

      // 2. Posting jurnal
      const lawanId = metode === "tunai" ? kasId : tradeAcc.hutang!.id;
      const journalId = await postJournal({
        tanggal,
        keterangan: `Penerimaan barang dari ${supplier?.nama_supplier} (PO ${po.nomor_po})`,
        business_unit_id: unitId,
        source: "goods_receipt",
        lines: [
          { account_id: tradeAcc.persediaan.id, debit: total, kredit: 0, keterangan: "Persediaan barang dagang" },
          { account_id: lawanId, debit: 0, kredit: total, keterangan: metode === "tunai" ? "Bayar tunai" : "Hutang supplier" },
        ],
      });

      // 3. Insert BAST
      const nomor = await generateDocNumber("BAST", "goods_receipts", "nomor_bast", tanggal);
      const { data: gr, error } = await supabase.from("goods_receipts").insert({
        nomor_bast: nomor, tanggal, po_id: po.id, metode_bayar: metode,
        kas_account_id: metode === "tunai" ? kasId : null,
        total, journal_id: journalId, business_unit_id: unitId,
      }).select("id, nomor_bast").single();
      if (error) throw error;

      // 4. Jika kredit → buat hutang (payables)
      if (metode === "kredit") {
        await supabase.from("payables").insert({
          tanggal, nama_kreditur: supplier?.nama_supplier ?? "Supplier",
          jumlah: total, klasifikasi: "jangka_pendek", is_paid: false,
          keterangan: `BAST ${nomor} (PO ${po.nomor_po})`, business_unit_id: unitId,
        });
      }

      // 5. Update status PO
      await supabase.from("purchase_orders").update({ status: "selesai" }).eq("id", po.id);

      toast.success(`Barang diterima — ${nomor}`);
      setDone({ id: gr.id, nomor: gr.nomor_bast });
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const cetak = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(buildBASTHtml({ nomor: done?.nomor ?? "(draft)", tanggal, po, supplier, items: poItems, allItems, total, metode }));
    w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav({ to: "/purchase-orders" })}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Penerimaan Barang (BAST)</h1>
      </div>

      <Card className="p-4 grid md:grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">PO:</span> <b>{po.nomor_po}</b></div>
        <div><span className="text-muted-foreground">Tanggal PO:</span> {formatDate(po.tanggal)}</div>
        <div><span className="text-muted-foreground">Supplier:</span> {supplier?.nama_supplier}</div>
        <div><span className="text-muted-foreground">Total PO:</span> <b className="font-mono">{formatRp(total)}</b></div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
          <TableBody>
            {poItems.map((l) => {
              const it = allItems[l.item_id];
              return (<TableRow key={l.id}>
                <TableCell>{it ? `${it.kode} — ${it.nama}` : l.item_id}</TableCell>
                <TableCell className="text-right font-mono">{l.qty} {it?.satuan ?? ""}</TableCell>
                <TableCell className="text-right font-mono">{formatRp(l.harga)}</TableCell>
                <TableCell className="text-right font-mono">{formatRp(l.subtotal)}</TableCell>
              </TableRow>);
            })}
          </TableBody>
        </Table>
      </Card>

      {!done ? (
        <Card className="p-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div><Label>Tanggal Terima</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
            <div><Label>Metode Pembayaran *</Label>
              <Select value={metode} onValueChange={(v) => setMetode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="tunai">Tunai</SelectItem><SelectItem value="kredit">Hutang Supplier</SelectItem></SelectContent>
              </Select>
            </div>
            {metode === "tunai" && (
              <div><Label>Akun Kas/Bank *</Label>
                <Select value={kasId} onValueChange={setKasId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{kasAccounts.map((k) => <SelectItem key={k.id} value={k.id}>{k.kode_akun} — {k.nama_akun}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="rounded-md border bg-muted/20 p-3 text-xs">
            <div className="font-semibold mb-1">Preview Jurnal Otomatis:</div>
            <div>Dr. Persediaan Barang Dagang — {formatRp(total)}</div>
            <div>Cr. {metode === "tunai" ? "Kas/Bank" : "Hutang Supplier"} — {formatRp(total)}</div>
          </div>
          <Button onClick={proses} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Proses Penerimaan & Buat Jurnal</Button>
        </Card>
      ) : (
        <Card className="p-4 space-y-3">
          <div className="text-emerald-600 font-medium">✔ BAST berhasil dibuat: <b>{done.nomor}</b></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cetak}><FileText className="h-4 w-4" /> Cetak BAST</Button>
            <Button variant="ghost" onClick={() => nav({ to: "/purchase-orders" })}>Kembali ke daftar PO</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function buildBASTHtml(d: any) {
  const rows = d.items.map((l: any) => {
    const it = d.allItems[l.item_id];
    return `<tr><td>${it?.kode ?? ""} — ${it?.nama ?? ""}</td><td style="text-align:right">${l.qty} ${it?.satuan ?? ""}</td><td style="text-align:right">${formatRp(l.harga)}</td><td style="text-align:right">${formatRp(l.subtotal)}</td></tr>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${d.nomor}</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}h1{text-align:center;margin:0 0 24px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #999;padding:6px 8px;font-size:12px}th{background:#eee;text-align:left}.info div{margin:4px 0}.sign{margin-top:48px;display:flex;justify-content:space-between}.sign div{text-align:center;width:220px}.sign .line{margin-top:64px;border-top:1px solid #333}</style></head>
<body>
<h1>BERITA ACARA SERAH TERIMA BARANG</h1>
<div class="info">
  <div>Pada hari ini telah dilakukan serah terima barang antara:</div>
  <div style="margin-top:8px">Pihak Pertama : <b>${d.supplier?.nama_supplier ?? "-"}</b></div>
  <div>Pihak Kedua : <b>BUMDes</b></div>
  <div>Nomor BAST : <b>${d.nomor}</b></div>
  <div>Tanggal : ${formatDate(d.tanggal)}</div>
  <div>Referensi PO : ${d.po.nomor_po}</div>
  <div>Metode Pembayaran : ${d.metode === "tunai" ? "Tunai" : "Hutang Supplier"}</div>
</div>
<table><thead><tr><th>Barang</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
<tbody>${rows}<tr><td colspan="3" style="text-align:right"><b>TOTAL</b></td><td style="text-align:right"><b>${formatRp(d.total)}</b></td></tr></tbody></table>
<p style="margin-top:16px">Barang telah diterima dalam kondisi baik dan sesuai dengan Purchase Order.</p>
<div class="sign"><div>Pihak Pertama,<div class="line">${d.supplier?.nama_supplier ?? ""}</div></div><div>Pihak Kedua,<div class="line">BUMDes</div></div></div>
</body></html>`;
}
