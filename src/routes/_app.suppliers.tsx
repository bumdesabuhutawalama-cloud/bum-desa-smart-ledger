import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/suppliers")({ component: SuppliersPage });

type Supplier = {
  id: string;
  nama_supplier: string;
  alamat: string | null;
  telepon: string | null;
  email: string | null;
  is_active: boolean;
};

const empty = { nama_supplier: "", alamat: "", telepon: "", email: "" };

function SuppliersPage() {
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("nama_supplier");
    setList((data as Supplier[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nama_supplier.trim()) return toast.error("Nama supplier wajib diisi");
    if (editId) {
      const { error } = await supabase.from("suppliers").update(form).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Supplier diperbarui");
    } else {
      const { error } = await supabase.from("suppliers").insert(form);
      if (error) return toast.error(error.message);
      toast.success("Supplier ditambahkan");
    }
    setOpen(false); setForm(empty); setEditId(null); load();
  };

  const edit = (s: Supplier) => {
    setEditId(s.id);
    setForm({ nama_supplier: s.nama_supplier, alamat: s.alamat ?? "", telepon: s.telepon ?? "", email: s.email ?? "" });
    setOpen(true);
  };

  const del = async (id: string) => {
    if (!confirm("Hapus supplier ini?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supplier dihapus"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Supplier</h1>
          <p className="text-sm text-muted-foreground">Master pemasok untuk Unit Perdagangan</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(empty); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Tambah Supplier</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Tambah"} Supplier</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nama Supplier *</Label><Input value={form.nama_supplier} onChange={(e) => setForm({ ...form, nama_supplier: e.target.value })} /></div>
              <div><Label>Alamat</Label><Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telepon</Label><Input value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Simpan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nama</TableHead><TableHead>Alamat</TableHead><TableHead>Telepon</TableHead><TableHead>Email</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada supplier.</TableCell></TableRow>}
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nama_supplier}</TableCell>
                  <TableCell>{s.alamat || "-"}</TableCell>
                  <TableCell>{s.telepon || "-"}</TableCell>
                  <TableCell>{s.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => edit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
