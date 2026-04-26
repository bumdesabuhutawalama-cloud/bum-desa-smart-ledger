import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRp, formatDate, todayISO } from "@/lib/format";
import { Loader2, Calculator, Link2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aset")({ component: AsetPage });

type Asset = {
  id: string;
  journal_id: string | null;
  nama: string;
  kategori: string | null;
  tanggal_perolehan: string;
  harga_perolehan: number;
  nilai_residu: number;
  masa_manfaat_bulan: number;
  akumulasi_penyusutan: number;
  is_active: boolean;
};

type Candidate = {
  journal_id: string;
  tanggal: string;
  nomor_jurnal: string;
  keterangan: string;
  account_id: string;
  kode_akun: string;
  nama_akun: string;
  debit: number;
};

function AsetPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Candidate | null>(null);
  const [form, setForm] = useState({
    nama: "", kategori: "", tanggal_perolehan: todayISO(),
    nilai_residu: "0", masa_manfaat_bulan: "60",
  });

  const load = async () => {
    setLoading(true);
    // 1) Aset existing
    const { data: assetsData, error: ae } = await supabase
      .from("assets")
      .select("*")
      .order("tanggal_perolehan", { ascending: false });
    if (ae) toast.error(ae.message);
    const assets = (assetsData as Asset[]) ?? [];
    setItems(assets);

    // 2) Calon aset: journal_lines debit > 0 di akun ASET dgn kode "1.3"
    //    yg journal_id-nya belum dipakai aset
    const usedJournalIds = new Set(assets.map((a) => a.journal_id).filter(Boolean) as string[]);

    const { data: accs } = await supabase
      .from("accounts")
      .select("id,kode_akun,nama_akun,tipe_akun")
      .eq("tipe_akun", "ASET")
      .like("kode_akun", "1.3%");
    const asetAccIds = (accs ?? []).map((a) => a.id);
    const accMap = new Map((accs ?? []).map((a) => [a.id, a]));

    if (asetAccIds.length === 0) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const { data: lines } = await supabase
      .from("journal_lines")
      .select("journal_id,account_id,debit, journals!inner(id,tanggal,nomor_jurnal,keterangan,status)")
      .in("account_id", asetAccIds)
      .gt("debit", 0)
      .eq("journals.status", "posted")
      .order("created_at", { ascending: false })
      .limit(200);

    const cands: Candidate[] = [];
    for (const l of (lines ?? []) as unknown as Array<{
      journal_id: string; account_id: string; debit: number;
      journals: { id: string; tanggal: string; nomor_jurnal: string; keterangan: string };
    }>) {
      if (usedJournalIds.has(l.journal_id)) continue;
      const acc = accMap.get(l.account_id);
      if (!acc) continue;
      cands.push({
        journal_id: l.journal_id,
        tanggal: l.journals.tanggal,
        nomor_jurnal: l.journals.nomor_jurnal,
        keterangan: l.journals.keterangan,
        account_id: l.account_id,
        kode_akun: acc.kode_akun,
        nama_akun: acc.nama_akun,
        debit: Number(l.debit),
      });
    }
    setCandidates(cands);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openLink = (c: Candidate) => {
    setActive(c);
    setForm({
      nama: c.keterangan || c.nama_akun,
      kategori: c.nama_akun,
      tanggal_perolehan: c.tanggal,
      nilai_residu: "0",
      masa_manfaat_bulan: "60",
    });
    setOpen(true);
  };

  const saveLink = async () => {
    if (!active) return;
    if (!form.nama.trim()) return toast.error("Nama aset wajib diisi");
    const residu = parseFloat(form.nilai_residu) || 0;
    const masa = parseInt(form.masa_manfaat_bulan) || 0;
    if (masa <= 0) return toast.error("Masa manfaat harus > 0");
    if (residu >= active.debit) return toast.error("Nilai residu harus < harga perolehan");

    const { error } = await supabase.from("assets").insert({
      journal_id: active.journal_id,
      asset_account_id: active.account_id,
      nama: form.nama,
      kategori: form.kategori || null,
      tanggal_perolehan: form.tanggal_perolehan,
      harga_perolehan: active.debit, // WAJIB dari jurnal
      nilai_residu: residu,
      masa_manfaat_bulan: masa,
    });
    if (error) return toast.error(error.message);
    toast.success("Aset berhasil dihubungkan dengan jurnal");
    setOpen(false);
    setActive(null);
    load();
  };

  const postPenyusutanBulanIni = async () => {
    setPosting(true);
    try {
      const now = new Date();
      const ymKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const { data: existing } = await supabase
        .from("journals").select("id")
        .like("nomor_jurnal", `DEPR-${ymKey}-%`).limit(1);
      if (existing && existing.length > 0) {
        toast.warning("Penyusutan bulan ini sudah dijurnal sebelumnya");
        return;
      }
      const { data: accs } = await supabase
        .from("accounts").select("id,kode_akun,nama_akun")
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
      const tgl = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
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

  const totals = useMemo(() => {
    const harga = items.reduce((s, a) => s + Number(a.harga_perolehan), 0);
    const akum = items.reduce((s, a) => s + Number(a.akumulasi_penyusutan), 0);
    return { harga, akum, buku: harga - akum };
  }, [items]);

  // grouping per kategori untuk subtotal
  const grouped = useMemo(() => {
    const g = new Map<string, Asset[]>();
    for (const a of items) {
      const k = a.kategori || "Lainnya";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(a);
    }
    return Array.from(g.entries());
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Aset Tetap</h1>
          <p className="text-sm text-muted-foreground">
            Terintegrasi dengan jurnal — harga perolehan otomatis dari jurnal akun aset (kode 1.3.x)
          </p>
        </div>
        <Button variant="outline" onClick={postPenyusutanBulanIni} disabled={posting || items.length === 0}>
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          Posting Penyusutan Bulan Ini
        </Button>
      </div>

      {/* Calon Aset */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Calon Aset Tetap dari Jurnal</h2>
          <Badge variant="secondary">{candidates.length}</Badge>
        </div>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tidak ada calon aset. Buat jurnal dengan debit pada akun aset (kode 1.3.x) untuk menambah aset baru.
          </p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Jurnal</TableHead>
                  <TableHead>Akun Aset</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={`${c.journal_id}-${c.account_id}`}>
                    <TableCell>{formatDate(c.tanggal)}</TableCell>
                    <TableCell className="font-mono text-xs">{c.nomor_jurnal}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{c.kode_akun}</span> {c.nama_akun}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate">{c.keterangan}</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(c.debit)}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openLink(c)}>
                        <Link2 className="h-3.5 w-3.5" /> Jadikan Aset
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Daftar Aset */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Aset</TableHead>
                <TableHead>Tgl Perolehan</TableHead>
                <TableHead>No. Jurnal</TableHead>
                <TableHead className="text-right">Harga Perolehan</TableHead>
                <TableHead className="text-right">Akum. Penyusutan</TableHead>
                <TableHead className="text-right">Nilai Buku</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada aset. Tambah aset melalui daftar Calon Aset di atas.
                </TableCell></TableRow>
              )}
              {grouped.map(([kategori, list]) => {
                const subHarga = list.reduce((s, a) => s + Number(a.harga_perolehan), 0);
                const subAkum = list.reduce((s, a) => s + Number(a.akumulasi_penyusutan), 0);
                return (
                  <AssetGroup key={kategori} kategori={kategori} list={list} subHarga={subHarga} subAkum={subAkum} />
                );
              })}
            </TableBody>
            {items.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">TOTAL ASET TETAP</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatRp(totals.harga)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">({formatRp(totals.akum)})</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatRp(totals.buku)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </Card>

      {/* Dialog Link → Aset */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Aset Tetap</DialogTitle>
            <DialogDescription>
              Harga perolehan otomatis diambil dari jurnal dan tidak dapat diubah.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
                <div><span className="text-muted-foreground">Jurnal:</span> <span className="font-mono">{active.nomor_jurnal}</span> · {formatDate(active.tanggal)}</div>
                <div><span className="text-muted-foreground">Akun:</span> <span className="font-mono text-xs">{active.kode_akun}</span> {active.nama_akun}</div>
                <div className="font-semibold">Harga Perolehan (dari jurnal): {formatRp(active.debit)}</div>
              </div>
              <div><Label>Nama aset *</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
              <div><Label>Kategori</Label><Input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="Kendaraan, Mesin, Bangunan…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tanggal perolehan</Label><Input type="date" value={form.tanggal_perolehan} onChange={(e) => setForm({ ...form, tanggal_perolehan: e.target.value })} /></div>
                <div><Label>Masa manfaat (bulan)</Label><Input type="number" value={form.masa_manfaat_bulan} onChange={(e) => setForm({ ...form, masa_manfaat_bulan: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Harga perolehan</Label>
                  <Input type="text" readOnly value={formatRp(active.debit)} className="bg-muted font-mono" />
                </div>
                <div>
                  <Label>Nilai residu</Label>
                  <Input type="number" value={form.nilai_residu} onChange={(e) => setForm({ ...form, nilai_residu: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={saveLink}>Simpan Aset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetGroup({ kategori, list, subHarga, subAkum }: { kategori: string; list: Asset[]; subHarga: number; subAkum: number }) {
  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell colSpan={6} className="font-semibold text-sm">{kategori}</TableCell>
      </TableRow>
      {list.map((a) => (
        <TableRow key={a.id}>
          <TableCell className="font-medium pl-6">{a.nama}</TableCell>
          <TableCell>{formatDate(a.tanggal_perolehan)}</TableCell>
          <TableCell className="font-mono text-xs text-muted-foreground">
            {a.journal_id ? <Badge variant="outline" className="font-mono">terhubung</Badge> : <Badge variant="secondary">manual</Badge>}
          </TableCell>
          <TableCell className="text-right font-mono">{formatRp(a.harga_perolehan)}</TableCell>
          <TableCell className="text-right font-mono">({formatRp(a.akumulasi_penyusutan)})</TableCell>
          <TableCell className="text-right font-mono font-medium">{formatRp(Number(a.harga_perolehan) - Number(a.akumulasi_penyusutan))}</TableCell>
        </TableRow>
      ))}
      <TableRow>
        <TableCell colSpan={3} className="text-right text-sm text-muted-foreground italic">Subtotal {kategori}</TableCell>
        <TableCell className="text-right font-mono font-semibold">{formatRp(subHarga)}</TableCell>
        <TableCell className="text-right font-mono font-semibold">({formatRp(subAkum)})</TableCell>
        <TableCell className="text-right font-mono font-semibold">{formatRp(subHarga - subAkum)}</TableCell>
      </TableRow>
    </>
  );
}
