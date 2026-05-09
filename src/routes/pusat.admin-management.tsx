// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, UserPlus, Pencil, Trash2, Ban, CheckCircle2, Users, Mail, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pusat/admin-management")({
  head: () => ({ meta: [{ title: "Manajemen Admin Unit — Unit Pusat" }] }),
  component: AdminManagement,
});

const ROLES = [
  { value: "admin_unit", label: "Admin Unit" },
  { value: "staff_unit", label: "Staff Unit" },
  { value: "super_admin", label: "Super Admin (Pusat)" },
];

type UserRow = {
  id: string;
  user_id: string;
  business_unit_id: string;
  role: string;
  is_suspended: boolean;
  email: string | null;
  full_name: string | null;
  business_units: { kode: string; nama: string } | null;
};

type Unit = { id: string; kode: string; nama: string };

function AdminManagement() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", business_unit_id: "", role: "admin_unit",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", business_unit_id: "", role: "admin_unit" });
  const [inviting, setInviting] = useState(false);

  const inviteRedirect = typeof window !== "undefined" ? `${window.location.origin}/set-password` : undefined;

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) nav({ to: "/" });
  }, [authLoading, isSuperAdmin, nav]);

  const reload = async () => {
    setLoading(true);
    try {
      const [{ data: bus }, fnRes] = await Promise.all([
        supabase.from("business_units").select("id, kode, nama").eq("is_active", true).order("kode"),
        supabase.functions.invoke("manage-users", { body: { action: "list" } }),
      ]);
      setUnits((bus ?? []) as Unit[]);
      if (fnRes.error) throw fnRes.error;
      setUsers(((fnRes.data as any)?.users ?? []) as UserRow[]);
    } catch (e: any) {
      toast.error("Gagal memuat data: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isSuperAdmin) reload(); }, [isSuperAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: "", password: "", full_name: "", business_unit_id: units[0]?.id ?? "", role: "admin_unit" });
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      email: u.email ?? "",
      password: "",
      full_name: u.full_name ?? "",
      business_unit_id: u.business_unit_id,
      role: u.role,
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      if (editing) {
        const payload: any = {
          action: "update",
          user_id: editing.user_id,
          full_name: form.full_name,
          business_unit_id: form.business_unit_id,
          role: form.role,
        };
        if (form.email && form.email !== editing.email) payload.email = form.email;
        if (form.password) payload.password = form.password;
        const { error } = await supabase.functions.invoke("manage-users", { body: payload });
        if (error) throw error;
        toast.success("Akun diperbarui");
      } else {
        if (!form.email || !form.password || !form.business_unit_id) {
          toast.error("Email, password, dan unit wajib diisi");
          setSaving(false);
          return;
        }
        const { error } = await supabase.functions.invoke("manage-users", {
          body: { action: "create", ...form },
        });
        if (error) throw error;
        toast.success("Akun admin baru dibuat");
      }
      setDialogOpen(false);
      await reload();
    } catch (e: any) {
      toast.error("Gagal menyimpan: " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspend = async (u: UserRow) => {
    try {
      const { error } = await supabase.functions.invoke("manage-users", {
        body: { action: "update", user_id: u.user_id, is_suspended: !u.is_suspended },
      });
      if (error) throw error;
      toast.success(u.is_suspended ? "Akun diaktifkan" : "Akun di-suspend");
      await reload();
    } catch (e: any) {
      toast.error("Gagal: " + (e?.message ?? e));
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      const { error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", user_id: confirmDelete.user_id },
      });
      if (error) throw error;
      toast.success("Akun dihapus");
      setConfirmDelete(null);
      await reload();
    } catch (e: any) {
      toast.error("Gagal menghapus: " + (e?.message ?? e));
    }
  };

  const openInvite = () => {
    setInviteForm({ email: "", full_name: "", business_unit_id: units[0]?.id ?? "", role: "admin_unit" });
    setInviteOpen(true);
  };

  const sendInvite = async () => {
    if (!inviteForm.email || !inviteForm.business_unit_id) {
      toast.error("Email dan unit wajib diisi");
      return;
    }
    setInviting(true);
    try {
      const { error } = await supabase.functions.invoke("manage-users", {
        body: { action: "invite", ...inviteForm, redirect_to: inviteRedirect },
      });
      if (error) throw error;
      toast.success(`Undangan terkirim ke ${inviteForm.email}`);
      setInviteOpen(false);
      await reload();
    } catch (e: any) {
      toast.error("Gagal mengundang: " + (e?.message ?? e));
    } finally {
      setInviting(false);
    }
  };

  const resendInvite = async (u: UserRow) => {
    if (!u.email) return;
    try {
      const { error } = await supabase.functions.invoke("manage-users", {
        body: { action: "resend_invite", email: u.email, redirect_to: inviteRedirect },
      });
      if (error) throw error;
      toast.success("Undangan dikirim ulang ke " + u.email);
    } catch (e: any) {
      toast.error("Gagal: " + (e?.message ?? e));
    }
  };

  if (authLoading || !isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/pusat/dashboard">
              <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-white hover:bg-slate-800">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
              </Button>
            </Link>
            <div>
              <div className="text-xs text-slate-300 uppercase tracking-wider">Unit Pusat</div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5" /> Manajemen Admin Unit
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={openInvite} variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-800">
              <Mail className="h-4 w-4 mr-1.5" /> Undang via Email
            </Button>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <UserPlus className="h-4 w-4 mr-1.5" /> Daftarkan Admin Baru
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-semibold">Daftar Pengguna Sistem</div>
              <div className="text-xs text-muted-foreground">
                Hanya pengguna terdaftar di sini yang dapat login ke aplikasi.
              </div>
            </div>
            <Badge variant="secondary">{users.length} akun</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama / Email</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada pengguna.</TableCell></TableRow>
              ) : users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? "-"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.business_units?.kode ?? "-"}</Badge>
                    <div className="text-xs text-muted-foreground mt-0.5">{u.business_units?.nama ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === "super_admin" ? "default" : "secondary"}>
                      {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resendInvite(u)} title="Kirim ulang undangan email" disabled={!u.email}>
                        <Send className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => toggleSuspend(u)}
                        title={u.is_suspended ? "Aktifkan" : "Suspend"}
                        disabled={u.user_id === user?.id}
                      >
                        {u.is_suspended ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-amber-600" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setConfirmDelete(u)}
                        title="Hapus"
                        disabled={u.user_id === user?.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Akun" : "Daftarkan Admin Baru"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui data akun pengguna." : "Buat akun baru untuk admin/staff unit usaha."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Lengkap</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>{editing ? "Password Baru (kosongkan bila tidak diubah)" : "Password"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Unit Usaha</Label>
              <Select value={form.business_unit_id} onValueChange={(v) => setForm({ ...form, business_unit_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.kode} — {u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Peran</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <b>{confirmDelete?.email}</b> akan dihapus permanen dan tidak bisa login lagi. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite via Email Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Undang Admin via Email</DialogTitle>
            <DialogDescription>
              Sistem akan mengirim email berisi tautan aman. Penerima akan menyetel password sendiri
              saat menerima undangan—Admin Pusat tidak perlu menentukan atau melihat password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Lengkap (opsional)</Label>
              <Input value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="admin@contoh.com" />
            </div>
            <div>
              <Label>Unit Usaha</Label>
              <Select value={inviteForm.business_unit_id} onValueChange={(v) => setInviteForm({ ...inviteForm, business_unit_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.kode} — {u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Peran</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Batal</Button>
            <Button onClick={sendInvite} disabled={inviting} className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="h-4 w-4 mr-1.5" /> {inviting ? "Mengirim…" : "Kirim Undangan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
