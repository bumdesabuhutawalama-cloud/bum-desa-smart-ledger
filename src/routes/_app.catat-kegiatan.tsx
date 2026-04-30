import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, Car, XCircle, ShoppingCart, PiggyBank, Building2, Droplets,
  Briefcase, HandCoins, PackagePlus, Receipt, PencilRuler, Users, Landmark,
  Zap, CalendarClock, Undo2, Coins, Sparkles, Eye,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle2, Car, XCircle, ShoppingCart, PiggyBank, Building2, Droplets,
  Briefcase, HandCoins, PackagePlus, Receipt, PencilRuler, Users, Landmark,
  Zap, CalendarClock, Undo2, Coins, Sparkles,
};
import { toast } from "sonner";
import { formatRp, todayISO } from "@/lib/format";
import { AccountLite, filterAccountsForField } from "@/lib/account-resolver";
import { useBusinessUnit } from "@/lib/business-unit-context";
import {
  ActivityTemplate,
  buildJournal,
  generateNomorJurnal,
  InputValues,
  validateInput,
} from "@/lib/activity-engine";

export const Route = createFileRoute("/_app/catat-kegiatan")({
  component: CatatKegiatanPage,
});

const renderIcon = (name: string, className = "h-6 w-6") => {
  const I = ICON_MAP[name] ?? Sparkles;
  return <I className={className} />;
};

function CatatKegiatanPage() {
  const { units, currentUnitId, setCurrentUnitId, defaultUnit } = useBusinessUnit();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Semua");
  const [activeTpl, setActiveTpl] = useState<ActivityTemplate | null>(null);
  // Unit yang dipakai untuk transaksi yang sedang dibuat (default = global selector / default unit)
  const [txUnitId, setTxUnitId] = useState<string>(
    () => (currentUnitId !== "ALL" ? currentUnitId : defaultUnit?.id ?? ""),
  );
  useEffect(() => {
    if (currentUnitId !== "ALL") setTxUnitId(currentUnitId);
    else if (!txUnitId && defaultUnit) setTxUnitId(defaultUnit.id);
  }, [currentUnitId, defaultUnit, txUnitId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [tplRes, accRes] = await Promise.all([
        (supabase as any)
          .from("activity_templates")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("accounts")
          .select("id, kode_akun, nama_akun, normal_balance, is_active, is_header, tipe_akun")
          .eq("is_active", true)
          .order("kode_akun"),
      ]);
      if (tplRes.error) toast.error("Gagal memuat template: " + tplRes.error.message);
      if (accRes.error) toast.error("Gagal memuat akun: " + accRes.error.message);
      setTemplates((tplRes.data ?? []) as ActivityTemplate[]);
      setAccounts((accRes.data ?? []) as AccountLite[]);
      setLoading(false);
    })();
  }, []);

  // Filter template berdasarkan jenis unit yang dipilih (selain unit umum/default).
  // applicable_units = null → berlaku semua unit. Selain itu hanya tampil bila jenis unit termasuk.
  const activeUnit = units.find((u) => u.id === txUnitId);
  const unitFilteredTemplates = useMemo(() => {
    if (!activeUnit || activeUnit.jenis === "umum") return templates;
    return templates.filter((t) => {
      const apps = (t as any).applicable_units as string[] | null | undefined;
      return !apps || apps.length === 0 || apps.includes(activeUnit.jenis);
    });
  }, [templates, activeUnit]);

  const businessTypes = useMemo(() => {
    const set = new Set<string>();
    unitFilteredTemplates.forEach((t) => set.add(t.business_type));
    return ["Semua", ...Array.from(set)];
  }, [unitFilteredTemplates]);

  const filtered = useMemo(
    () =>
      filter === "Semua"
        ? unitFilteredTemplates
        : unitFilteredTemplates.filter((t) => t.business_type === filter),
    [unitFilteredTemplates, filter],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catat Kegiatan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih jenis kegiatan usaha — sistem akan membuat jurnal akuntansi otomatis sesuai prinsip double-entry.
          </p>
        </div>
        <div className="md:min-w-[260px]">
          <Label className="text-xs text-muted-foreground">Unit Usaha (untuk transaksi ini)</Label>
          <Select value={txUnitId} onValueChange={setTxUnitId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih unit usaha…" />
            </SelectTrigger>
            <SelectContent>
              {units.filter((u) => u.is_active).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.kode} — {u.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {businessTypes.map((bt) => (
          <Button
            key={bt}
            variant={filter === bt ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(bt)}
          >
            {bt}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat template…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Belum ada template untuk kategori / unit ini.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="p-5 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
              onClick={() => setActiveTpl(t)}
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  {renderIcon(t.icon, "h-6 w-6")}
                </div>
                <div className="min-w-0 flex-1">
                  <Badge variant="secondary" className="text-[10px] mb-1.5">{t.business_type}</Badge>
                  <div className="font-semibold leading-tight">{t.name}</div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{t.description}</div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTpl && (
        <ActivityDialog
          template={activeTpl}
          accounts={accounts}
          businessUnitId={txUnitId}
          businessUnitLabel={activeUnit ? `${activeUnit.kode} — ${activeUnit.nama}` : ""}
          onClose={() => setActiveTpl(null)}
        />
      )}
    </div>
  );
}

function ActivityDialog({
  template,
  accounts,
  businessUnitId,
  businessUnitLabel,
  onClose,
}: {
  template: ActivityTemplate;
  accounts: AccountLite[];
  businessUnitId: string;
  businessUnitLabel: string;
  onClose: () => void;
}) {
  const initialValues: InputValues = useMemo(() => {
    const v: InputValues = {};
    template.fields.forEach((f) => {
      if (f.type === "date") v[f.key] = todayISO();
      else if (f.type === "number") v[f.key] = 0;
      else v[f.key] = "";
    });
    return v;
  }, [template]);

  const [values, setValues] = useState<InputValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);

  const validationErrors = useMemo(() => validateInput(template, values), [template, values]);
  const built = useMemo(
    () => buildJournal(template, values, accounts),
    [template, values, accounts],
  );

  const tanggalField = template.fields.find((f) => f.type === "date");
  const tanggal = (tanggalField ? String(values[tanggalField.key]) : todayISO()) || todayISO();

  const setField = (key: string, value: string | number) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }
    if (!built.ok) {
      toast.error(built.errors[0] || "Jurnal tidak valid");
      return;
    }
    if (!businessUnitId) {
      toast.error("Pilih unit usaha terlebih dahulu");
      return;
    }
    setSubmitting(true);
    try {
      const nomor = await generateNomorJurnal(supabase, tanggal);
      const { data: { user } } = await supabase.auth.getUser();

      // Insert journal
      const { data: jurnal, error: errJ } = await (supabase as any)
        .from("journals")
        .insert({
          nomor_jurnal: nomor,
          tanggal,
          keterangan: built.keterangan,
          status: "posted",
          source: "activity",
          created_by: user?.id ?? null,
          business_unit_id: businessUnitId,
        })
        .select("id")
        .single();
      if (errJ || !jurnal) throw errJ ?? new Error("Gagal membuat jurnal");

      // Insert lines
      const linesPayload = built.lines.map((l, i) => ({
        journal_id: jurnal.id,
        account_id: l.account_id,
        debit: l.debit,
        kredit: l.kredit,
        keterangan: l.keterangan ?? null,
        line_order: i,
      }));
      const { error: errL } = await supabase.from("journal_lines").insert(linesPayload);
      if (errL) throw errL;

      // Insert activity entry (audit trail)
      const { error: errE } = await (supabase as any).from("activity_entries").insert({
        template_id: template.id,
        journal_id: jurnal.id,
        input_data: values,
        created_by: user?.id ?? null,
        business_unit_id: businessUnitId,
      });
      if (errE) {
        // jurnal sudah masuk, tetapi entry gagal — beri peringatan ringan
        console.warn("activity_entries insert failed:", errE);
      }

      toast.success(`Jurnal ${nomor} berhasil dicatat untuk ${businessUnitLabel || "unit terpilih"}`);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan";
      toast.error("Gagal menyimpan: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {renderIcon(template.icon, "h-5 w-5")}
            {template.name}
          </DialogTitle>
          {template.description && (
            <DialogDescription>{template.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {template.fields.map((f) => (
              <div key={f.key} className={f.type === "text" || f.type === "account" ? "sm:col-span-2" : ""}>
                <Label className="text-sm">
                  {f.label}
                  {f.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {f.type === "text" && (
                  <Input
                    value={String(values[f.key] ?? "")}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.helper}
                  />
                )}
                {f.type === "number" && (
                  <Input
                    type="number"
                    min={0}
                    value={Number(values[f.key] ?? 0)}
                    onChange={(e) => setField(f.key, parseFloat(e.target.value) || 0)}
                  />
                )}
                {f.type === "date" && (
                  <Input
                    type="date"
                    value={String(values[f.key] ?? todayISO())}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                )}
                {f.type === "account" && (
                  <Select
                    value={String(values[f.key] ?? "")}
                    onValueChange={(v) => setField(f.key, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih akun…" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterAccountsForField(f.account_filter ?? "", accounts).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.kode_akun} — {a.nama_akun}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {f.helper && f.type !== "text" && (
                  <p className="text-xs text-muted-foreground mt-1">{f.helper}</p>
                )}
              </div>
            ))}
          </div>

          {/* Preview Jurnal */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview Jurnal Otomatis
              </div>
              <Badge variant={built.ok ? "default" : "destructive"}>
                {built.ok ? "Balance" : "Tidak Balance"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Keterangan: <span className="text-foreground">{built.keterangan || "—"}</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Akun</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {built.preview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-4">
                      Lengkapi data di atas untuk melihat preview jurnal.
                    </TableCell>
                  </TableRow>
                ) : (
                  built.preview.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">
                        {l.kode_akun ? `${l.kode_akun} — ${l.nama_akun}` : "(akun belum dipilih)"}
                        {l.keterangan && (
                          <div className="text-muted-foreground">{l.keterangan}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {l.debit > 0 ? formatRp(l.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {l.kredit > 0 ? formatRp(l.kredit) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-semibold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatRp(built.totalDebit)}</TableCell>
                  <TableCell className="text-right">{formatRp(built.totalKredit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {built.errors.length > 0 && (
              <div className="mt-3 text-xs text-destructive space-y-1">
                {built.errors.map((e, i) => (
                  <div key={i}>• {e}</div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button asChild variant="ghost" disabled={submitting}>
            <Link to="/jurnal">Lihat Jurnal Umum</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !built.ok}>
            {submitting ? "Menyimpan…" : "Simpan & Posting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
