import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  ACCOUNT_TYPES, AccountType, NormalBalance,
  defaultNormalBalance, levelFromKode, validateAccountDraft, generateKodeAkun, isLeafLevel,
} from "@/lib/account-utils";

type Acc = {
  id: string;
  kode_akun: string;
  nama_akun: string;
  tipe_akun: string;
  normal_balance: string;
  is_header: boolean;
  is_active: boolean;
  level: number;
  parent_id: string | null;
  description: string | null;
};

export const Route = createFileRoute("/_app/akun")({ component: AkunPage });

const emptyForm = () => ({
  id: "",
  kode_akun: "",
  nama_akun: "",
  tipe_akun: "ASET" as AccountType,
  normal_balance: "DEBIT" as NormalBalance,
  parent_kode: "",
  is_header: false,
  is_active: true,
  description: "",
});

function AkunPage() {
  const { roles } = useAuth();
  const canEdit = roles.includes("admin") || roles.includes("bendahara");

  const [rows, setRows] = useState<Acc[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState<Acc | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("accounts").select("*").order("kode_akun");
    setRows((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) =>
      !q || r.kode_akun.includes(q) || r.nama_akun.toLowerCase().includes(q.toLowerCase()),
    ),
    [rows, q],
  );

  const headers = useMemo(() => rows.filter((r) => r.is_header && !isLeafLevel(r.kode_akun)), [rows]);
  // Parent candidates: header non-leaf, dengan filter tipe akun (kecuali saat tipe belum dipilih untuk level 1)
  const parentCandidates = useMemo(
    () => headers.filter((h) => h.tipe_akun === form.tipe_akun),
    [headers, form.tipe_akun],
  );

  // Saat tipe akun berubah → reset parent (kode di-clear, harus pilih parent lagi)
  const onTipeChange = (t: AccountType) => {
    setForm((f) => ({
      ...f,
      tipe_akun: t,
      normal_balance: defaultNormalBalance(t),
      parent_kode: "",
      kode_akun: editing ? f.kode_akun : "",
    }));
  };

  // Saat parent dipilih → otomatis generate kode (READONLY untuk user)
  const onParentChange = (kode: string) => {
    if (!kode) {
      setForm((f) => ({ ...f, parent_kode: "", kode_akun: editing ? f.kode_akun : "" }));
      return;
    }
    const parent = rows.find((r) => r.kode_akun === kode);
    if (!parent) return;
    if (isLeafLevel(parent.kode_akun)) {
      toast.error("Akun level terakhir tidak bisa memiliki turunan");
      return;
    }
    try {
      const nextKode = generateKodeAkun(parent.kode_akun, rows.map((r) => r.kode_akun));
      const inheritedTipe = parent.tipe_akun as AccountType;
      setForm((f) => ({
        ...f,
        parent_kode: kode,
        kode_akun: editing ? f.kode_akun : nextKode,
        tipe_akun: inheritedTipe,
        normal_balance: defaultNormalBalance(inheritedTipe),
      }));
    } catch (e: any) {
      toast.error(e.message ?? "Gagal generate kode");
    }
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const startEdit = (a: Acc) => {
    setEditing(a);
    const parent = rows.find((r) => r.id === a.parent_id);
    setForm({
      id: a.id,
      kode_akun: a.kode_akun,
      nama_akun: a.nama_akun,
      tipe_akun: a.tipe_akun as AccountType,
      normal_balance: a.normal_balance as NormalBalance,
      parent_kode: parent?.kode_akun ?? "",
      is_header: a.is_header,
      is_active: a.is_active,
      description: a.description ?? "",
    });
    setOpen(true);
  };

  const startEdit = (a: Acc) => {
    setEditing(a);
    const parent = rows.find((r) => r.id === a.parent_id);
    setForm({
      id: a.id,
      kode_akun: a.kode_akun,
      nama_akun: a.nama_akun,
      tipe_akun: a.tipe_akun as AccountType,
      normal_balance: a.normal_balance as NormalBalance,
      parent_kode: parent?.kode_akun ?? "",
      is_header: a.is_header,
      is_active: a.is_active,
      description: a.description ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Validasi
      const accountsLite = rows.map((r) => ({
        id: r.id, kode_akun: r.kode_akun, nama_akun: r.nama_akun,
        normal_balance: r.normal_balance as NormalBalance,
        is_active: r.is_active, is_header: r.is_header, tipe_akun: r.tipe_akun,
      }));
      const checkAccounts = editing
        ? accountsLite.filter((a) => a.id !== editing.id)
        : accountsLite;
      const errs = validateAccountDraft(
        {
          kode_akun: form.kode_akun,
          nama_akun: form.nama_akun,
          tipe_akun: form.tipe_akun,
          normal_balance: form.normal_balance,
          parent_kode: form.parent_kode || undefined,
          is_header: form.is_header,
          description: form.description,
        },
        checkAccounts as any,
      );
      if (errs.length > 0) {
        toast.error(errs[0]);
        return;
      }

      const parent = form.parent_kode
        ? rows.find((r) => r.kode_akun === form.parent_kode)
        : null;

      const payload = {
        kode_akun: form.kode_akun.trim(),
        nama_akun: form.nama_akun.trim(),
        tipe_akun: form.tipe_akun,
        normal_balance: form.normal_balance,
        parent_id: parent?.id ?? null,
        level: levelFromKode(form.kode_akun.trim()),
        is_header: form.is_header,
        is_active: form.is_active,
        description: form.description || null,
      };

      const { error } = editing
        ? await (supabase as any).from("accounts").update(payload).eq("id", editing.id)
        : await (supabase as any).from("accounts").insert(payload);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(editing ? "Akun diperbarui" : "Akun ditambahkan");
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bagan Akun</h1>
          <p className="text-sm text-muted-foreground">{rows.length} akun (Kepmendesa 136/2022)</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Cari kode/nama..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={startCreate}>
                  <Plus className="h-4 w-4" /> Tambah Akun
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Ubah Akun" : "Tambah Akun"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Kode Akun *</Label>
                      <Input
                        value={form.kode_akun}
                        onChange={(e) => setForm({ ...form, kode_akun: e.target.value })}
                        placeholder="1.1.01.06"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Format hierarkis: 1-4 segmen.</p>
                    </div>
                    <div>
                      <Label>Tipe Akun *</Label>
                      <Select value={form.tipe_akun} onValueChange={(v) => onTipeChange(v as AccountType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Nama Akun *</Label>
                    <Input
                      value={form.nama_akun}
                      onChange={(e) => setForm({ ...form, nama_akun: e.target.value })}
                      placeholder="Kas di Bank Jago"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Saldo Normal</Label>
                      <Select
                        value={form.normal_balance}
                        onValueChange={(v) => setForm({ ...form, normal_balance: v as NormalBalance })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEBIT">DEBIT</SelectItem>
                          <SelectItem value="KREDIT">KREDIT</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Default mengikuti tipe. Override hanya untuk akun kontra (mis. Penyisihan Piutang).
                      </p>
                    </div>
                    <div>
                      <Label>Parent (opsional)</Label>
                      <Select
                        value={form.parent_kode || "__none__"}
                        onValueChange={(v) => onParentChange(v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="(tanpa parent)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">(tanpa parent)</SelectItem>
                          {parentCandidates.map((h) => (
                            <SelectItem key={h.id} value={h.kode_akun}>
                              {h.kode_akun} — {h.nama_akun}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Daftar parent otomatis menyesuaikan tipe akun. Memilih parent akan menyarankan kode berikutnya.
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label>Deskripsi</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.is_header}
                        onCheckedChange={(v) => setForm({ ...form, is_header: v })}
                      />
                      <Label className="text-sm">Akun Header (tidak bisa dipakai di jurnal)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                      />
                      <Label className="text-sm">Aktif</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Kode</th>
                  <th className="px-4 py-2 font-medium">Nama Akun</th>
                  <th className="px-4 py-2 font-medium">Tipe</th>
                  <th className="px-4 py-2 font-medium">Saldo Normal</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={r.is_header ? "bg-muted/30 font-semibold" : "border-t"}>
                    <td
                      className="px-4 py-2 font-mono text-xs"
                      style={{ paddingLeft: `${r.level * 12 + 8}px` }}
                    >
                      {r.kode_akun}
                      {!r.is_active && <Badge variant="secondary" className="ml-2 text-[10px]">Nonaktif</Badge>}
                    </td>
                    <td className="px-4 py-2">{r.nama_akun}</td>
                    <td className="px-4 py-2"><Badge variant="secondary">{r.tipe_akun}</Badge></td>
                    <td className="px-4 py-2">
                      <span className={r.normal_balance === "DEBIT" ? "text-debit" : "text-kredit"}>
                        {r.normal_balance}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
