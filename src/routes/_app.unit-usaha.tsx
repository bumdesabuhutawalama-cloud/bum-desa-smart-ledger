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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Loader2, Star, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useBusinessUnit } from "@/lib/business-unit-context";

export const Route = createFileRoute("/_app/unit-usaha")({ component: UnitUsahaPage });

type JenisOption = { value: string; label: string };

const FALLBACK_JENIS: JenisOption[] = [
  { value: "umum", label: "Umum / Konsolidasi" },
];

type Unit = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  deskripsi: string | null;
  is_active: boolean;
  is_default: boolean;
};

const empty = () => ({
  id: "",
  kode: "",
  nama: "",
  jenis: "umum",
  deskripsi: "",
  is_active: true,
});

function UnitUsahaPage() {
  const { roles } = useAuth();
  const { reload } = useBusinessUnit();
  const isAdmin = roles.includes("admin");

  const [items, setItems] = useState<Unit[]>([]);
  const [jenisOptions, setJenisOptions] = useState<JenisOption[]>(FALLBACK_JENIS);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState<Unit | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("business_units")
      .select("*")
      .order("is_default", { ascending: false })
      .order("nama");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Unit[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = (u: Unit) => {
    setEditing(u);
    setForm({
      id: u.id,
      kode: u.kode,
      nama: u.nama,
      jenis: u.jenis,
      deskripsi: u.deskripsi ?? "",
      is_active: u.is_active,
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
      kode: form.kode.trim().toUpperCase(),
      nama: form.nama.trim(),
      jenis: form.jenis,
      deskripsi: form.deskripsi || null,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await (supabase as any).from("business_units").update(payload).eq("id", editing.id)
      : await (supabase as any).from("business_units").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Unit diperbarui" : "Unit ditambahkan");
    setOpen(false);
    await load();
    await reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Unit Usaha</h1>
          <p className="text-sm text-muted-foreground">
            Kelola unit usaha BUMDes (Simpan Pinjam, PAM, Perdagangan, dll). Setiap transaksi akan di-tag ke unit yang
            dipilih.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate}>
                <Plus className="h-4 w-4" /> Tambah Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Ubah Unit Usaha" : "Tambah Unit Usaha"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kode *</Label>
                    <Input
                      value={form.kode}
                      onChange={(e) => setForm({ ...form, kode: e.target.value })}
                      placeholder="SP / PAM / DAGANG"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <Label>Jenis</Label>
                    <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JENIS_OPTIONS.map((j) => (
                          <SelectItem key={j.value} value={j.value}>
                            {j.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Nama *</Label>
                  <Input
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    placeholder="Unit Simpan Pinjam"
                  />
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Input
                    value={form.deskripsi}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) =>
                      setForm({
                        ...form,
                        is_active: editing?.is_default ? true : v,
                      })
                    }
                    disabled={editing?.is_default}
                  />
                  <Label className="text-sm">
                    Aktif {editing?.is_default && "(unit default tidak dapat dinonaktifkan)"}
                  </Label>
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
                <TableHead>Jenis</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada unit usaha.
                  </TableCell>
                </TableRow>
              )}
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono font-medium">
                    {u.kode}
                    {u.is_default && (
                      <Badge variant="secondary" className="ml-2 gap-1">
                        <Star className="h-3 w-3" /> Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{u.nama}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {JENIS_OPTIONS.find((j) => j.value === u.jenis)?.label ?? u.jenis}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.deskripsi ?? "-"}</TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(u)}>
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
