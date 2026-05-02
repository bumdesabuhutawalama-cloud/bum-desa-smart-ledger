import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Pencil, Layers } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/jenis-usaha")({ component: JenisUsahaPage });

type Jenis = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  icon: string;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
};

const empty = () => ({
  id: "",
  kode: "",
  nama: "",
  deskripsi: "",
  icon: "Briefcase",
  is_active: true,
  sort_order: 100,
});

function JenisUsahaPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [items, setItems] = useState<Jenis[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState<Jenis | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("business_unit_types")
      .select("*")
      .order("sort_order")
      .order("nama");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Jenis[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = (j: Jenis) => {
    setEditing(j);
    setForm({
      id: j.id,
      kode: j.kode,
      nama: j.nama,
      deskripsi: j.deskripsi ?? "",
      icon: j.icon,
      is_active: j.is_active,
      sort_order: j.sort_order,
    });
    setOpen(true);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  const save = async () => {
    if (!form.kode.trim() || !form.nama.trim()) {
      toast.error("Kode dan Nama wajib diisi");
      return;
    }
    const payload = {
      kode: form.kode.trim().toLowerCase().replace(/\s+/g, "_"),
      nama: form.nama.trim(),
      deskripsi: form.deskripsi || null,
      icon: form.icon || "Briefcase",
      is_active: form.is_active,
      sort_order: form.sort_order || 100,
    };
    const { error } = editing
      ? await (supabase as any).from("business_unit_types").update(payload).eq("id", editing.id)
      : await (supabase as any).from("business_unit_types").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Jenis usaha diperbarui" : "Jenis usaha ditambahkan");
    setOpen(false);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" /> Jenis Usaha
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola kategori jenis unit usaha BUM Desa. Jenis ini dipakai pada saat membuat unit usaha baru dan
            menentukan template kegiatan yang relevan.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate}>
                <Plus className="h-4 w-4" /> Tambah Jenis
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Ubah Jenis Usaha" : "Tambah Jenis Usaha"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kode *</Label>
                    <Input
                      value={form.kode}
                      onChange={(e) => setForm({ ...form, kode: e.target.value })}
                      placeholder="simpan_pinjam"
                      maxLength={40}
                      disabled={!!editing?.is_system}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Otomatis lowercase + underscore. Tidak bisa diubah untuk jenis bawaan sistem.
                    </p>
                  </div>
                  <div>
                    <Label>Urutan</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Nama *</Label>
                  <Input
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    placeholder="Simpan Pinjam"
                  />
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Input
                    value={form.deskripsi}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ikon (Lucide)</Label>
                  <Input
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="Briefcase"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label className="text-sm">Aktif</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={save}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada jenis usaha.
                  </TableCell>
                </TableRow>
              )}
              {items.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-xs">
                    {j.kode}
                    {j.is_system && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">Sistem</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{j.nama}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.deskripsi ?? "-"}</TableCell>
                  <TableCell>
                    {j.is_active ? (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(j)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
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
