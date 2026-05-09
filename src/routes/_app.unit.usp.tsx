import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusinessUnit } from "@/lib/unit-context";
import { postJournal } from "@/lib/trade-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, HandCoins, CreditCard, ShieldCheck, AlertCircle, BookOpen, FileText } from "lucide-react";
import { formatRp, todayISO } from "@/lib/format";
import { toast } from "sonner";

type SpUnit = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  is_active: boolean;
};

type Member = {
  id: string;
  nama: string;
  alamat: string | null;
  no_hp: string | null;
  tanggal_daftar: string;
  status_aktif: boolean;
  business_unit_id: string;
};

type Loan = {
  id: string;
  member_id: string;
  tanggal_pencairan: string;
  jumlah_pinjaman: number;
  bunga_persen_per_tahun: number;
  tenor_bulan: number;
  angsuran_per_bulan: number;
  sisa_pinjaman: number;
  status: "aktif" | "lunas" | "macet";
  business_unit_id: string;
  member?: { nama: string };
};

type Installment = {
  id: string;
  loan_id: string;
  tanggal_bayar: string;
  pokok: number;
  bunga: number;
  denda: number;
  total_bayar: number;
  business_unit_id: string;
  loan?: { id: string; member_id: string; member?: { nama: string } };
};

type Account = {
  id: string;
  kode_akun: string;
  nama_akun: string;
  tipe_akun: string;
  normal_balance: "DEBIT" | "KREDIT";
};

const USP_ACCOUNT_CODES = {
  KAS_USP: "1.1.01.06",
  BANK_USP: "1.1.01.07",
  PIUTANG_PINJAMAN: "1.1.03.03",
  CADANGAN_KERUGIAN_PIUTANG: "1.1.04.03",
  BEBAN_PENYISIHAN_PIUTANG: "6.1.07.07",
  PENDAPATAN_BUNGA: "4.1.08.02",
  PENDAPATAN_DENDA: "4.1.08.03",
};

export const Route = createFileRoute("/_app/unit/usp")({ component: UspPage });

function UspPage() {
  const { user } = useAuth();
  const { units, currentUnitId } = useBusinessUnit();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"anggota" | "pinjaman" | "angsuran" | "penyisihan">("anggota");
  const [unitId, setUnitId] = useState<string>("" );
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account | null>>({
    kasUsp: null,
    bankUsp: null,
    piutang: null,
    cadangan: null,
    pendapatanBunga: null,
    pendapatanDenda: null,
    bebanPenyisihan: null,
  });
  const [piutangSaldo, setPiutangSaldo] = useState<number>(0);
  const [memberForm, setMemberForm] = useState({ nama: "", alamat: "", no_hp: "", status_aktif: true });
  const [loanForm, setLoanForm] = useState({ member_id: "", tanggal_pencairan: todayISO(), jumlah_pinjaman: 0, bunga: 12, tenor: 12, akun_kas: "" });
  const [paymentForm, setPaymentForm] = useState({ loan_id: "", total_bayar: 0, denda: 0, akun_kas: "" });
  const [provisionForm, setProvisionForm] = useState({ loan_id: "", jumlah: 0, set_macet: false });
  const [saving, setSaving] = useState(false);

  const spUnits = useMemo(
    () => units.filter((u) => u.jenis === "simpan_pinjam" && u.is_active),
    [units],
  );

  useEffect(() => {
    if (currentUnitId !== "ALL") {
      const found = spUnits.find((u) => u.id === currentUnitId);
      if (found) {
        setUnitId(found.id);
        return;
      }
    }
    if (!unitId && spUnits.length > 0) {
      setUnitId(spUnits[0].id);
    }
  }, [currentUnitId, spUnits, unitId]);

  useEffect(() => {
    loadAll();
  }, [unitId]);

  const loadAll = async () => {
    if (!unitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: m }, { data: l }, { data: i }, { data: a }] = await Promise.all([
        supabase.from("usp_members").select("*").eq("business_unit_id", unitId).order("nama"),
        supabase
          .from("usp_loans")
          .select("*, member:usp_members(nama)")
          .eq("business_unit_id", unitId)
          .order("tanggal_pencairan", { ascending: false }),
        supabase
          .from("usp_loan_installments")
          .select("*, loan:usp_loans(id, member_id, business_unit_id)")
          .eq("business_unit_id", unitId)
          .order("tanggal_bayar", { ascending: false })
          .limit(100),
        supabase
          .from("accounts")
          .select("id,kode_akun,nama_akun,tipe_akun,normal_balance")
          .in("kode_akun", Object.values(USP_ACCOUNT_CODES)),
      ]);

      const accountsMap: Record<string, Account | null> = {
        kasUsp: null,
        bankUsp: null,
        piutang: null,
        cadangan: null,
        pendapatanBunga: null,
        pendapatanDenda: null,
        bebanPenyisihan: null,
      };
      (a ?? []).forEach((acc: any) => {
        if (acc.kode_akun === USP_ACCOUNT_CODES.KAS_USP) accountsMap.kasUsp = acc;
        if (acc.kode_akun === USP_ACCOUNT_CODES.BANK_USP) accountsMap.bankUsp = acc;
        if (acc.kode_akun === USP_ACCOUNT_CODES.PIUTANG_PINJAMAN) accountsMap.piutang = acc;
        if (acc.kode_akun === USP_ACCOUNT_CODES.CADANGAN_KERUGIAN_PIUTANG) accountsMap.cadangan = acc;
        if (acc.kode_akun === USP_ACCOUNT_CODES.PENDAPATAN_BUNGA) accountsMap.pendapatanBunga = acc;
        if (acc.kode_akun === USP_ACCOUNT_CODES.PENDAPATAN_DENDA) accountsMap.pendapatanDenda = acc;
        if (acc.kode_akun === USP_ACCOUNT_CODES.BEBAN_PENYISIHAN_PIUTANG) accountsMap.bebanPenyisihan = acc;
      });
      setAccounts(accountsMap);

      setMembers((m ?? []) as Member[]);
      setLoans(((l ?? []) as any[]).map((loan) => ({
        ...loan,
        jumlah_pinjaman: Number(loan.jumlah_pinjaman),
        bunga_persen_per_tahun: Number(loan.bunga_persen_per_tahun),
        tenor_bulan: Number(loan.tenor_bulan),
        angsuran_per_bulan: Number(loan.angsuran_per_bulan),
        sisa_pinjaman: Number(loan.sisa_pinjaman),
        member: loan.member,
      })) as Loan[]);
      setInstallments(((i ?? []) as any[]).map((inst) => ({
        ...inst,
        pokok: Number(inst.pokok),
        bunga: Number(inst.bunga),
        denda: Number(inst.denda),
        total_bayar: Number(inst.total_bayar),
        loan: inst.loan,
      })) as Installment[]);

      if (accountsMap.piutang) {
        const { data: piutangLines } = await supabase
          .from("journal_lines")
          .select("debit,kredit,journals!inner(tanggal,status,business_unit_id)")
          .eq("account_id", accountsMap.piutang.id)
          .eq("journals.status", "posted")
          .eq("journals.business_unit_id", unitId);
        const balance = (piutangLines ?? []).reduce((sum: number, row: any) => sum + Number(row.debit) - Number(row.kredit), 0);
        setPiutangSaldo(balance);
      } else {
        setPiutangSaldo(0);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal memuat data USP";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const totalOutstanding = useMemo(
    () => loans.reduce((sum, loan) => sum + Number(loan.sisa_pinjaman), 0),
    [loans],
  );

  const accountMismatch = Math.abs(totalOutstanding - piutangSaldo) > 0.5;

  const savingsAccounts = useMemo(
    () => [accounts.kasUsp, accounts.bankUsp].filter(Boolean) as Account[],
    [accounts],
  );

  const activeLoans = useMemo(
    () => loans.filter((loan) => loan.status !== "lunas"),
    [loans],
  );

  const selectedLoan = useMemo(
    () => activeLoans.find((loan) => loan.id === paymentForm.loan_id) ?? null,
    [activeLoans, paymentForm.loan_id],
  );

  const installmentLoan = useMemo(
    () => loans.find((loan) => loan.id === provisionForm.loan_id) ?? null,
    [loans, provisionForm.loan_id],
  );

  const currentUnit = useMemo(
    () => units.find((u) => u.id === unitId) ?? null,
    [units, unitId],
  );

  const calculateMonthlyPayment = (amount: number, rate: number, tenor: number) => {
    if (amount <= 0 || tenor <= 0) return 0;
    const totalInterest = (amount * rate * tenor) / 1200;
    return Math.round((amount + totalInterest) / tenor);
  };

  const createMember = async () => {
    if (!memberForm.nama.trim()) return toast.error("Nama anggota wajib diisi");
    if (!unitId) return toast.error("Unit Simpan Pinjam belum dipilih");
    setSaving(true);
    try {
      const { error } = await supabase.from("usp_members").insert({
        nama: memberForm.nama.trim(),
        alamat: memberForm.alamat || null,
        no_hp: memberForm.no_hp || null,
        tanggal_daftar: todayISO(),
        status_aktif: memberForm.status_aktif,
        business_unit_id: unitId,
      });
      if (error) throw error;
      toast.success("Anggota USP berhasil ditambahkan");
      setMemberForm({ nama: "", alamat: "", no_hp: "", status_aktif: true });
      await loadAll();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal simpan anggota");
    } finally {
      setSaving(false);
    }
  };

  const createLoan = async () => {
    if (!loanForm.member_id) return toast.error("Pilih anggota");
    if (!loanForm.jumlah_pinjaman || loanForm.jumlah_pinjaman <= 0) return toast.error("Jumlah pinjaman wajib lebih besar dari 0");
    if (loanForm.tenor <= 0) return toast.error("Tenor wajib lebih besar dari 0");
    if (!loanForm.akun_kas) return toast.error("Pilih akun Kas/Bank USP");
    if (!accounts.piutang) return toast.error("Akun Piutang Pinjaman belum tersedia");
    if (!currentUnit || currentUnit.jenis !== "simpan_pinjam") return toast.error("Pilih unit Simpan Pinjam aktif terlebih dahulu");
    setSaving(true);
    try {
      const angsuran = calculateMonthlyPayment(loanForm.jumlah_pinjaman, loanForm.bunga, loanForm.tenor);
      const loanInsert = await supabase.from("usp_loans").insert({
        member_id: loanForm.member_id,
        tanggal_pencairan: loanForm.tanggal_pencairan,
        jumlah_pinjaman: loanForm.jumlah_pinjaman,
        bunga_persen_per_tahun: loanForm.bunga,
        tenor_bulan: loanForm.tenor,
        angsuran_per_bulan: angsuran,
        sisa_pinjaman: loanForm.jumlah_pinjaman,
        status: "aktif",
        business_unit_id: unitId,
      }).select("id").single();
      const loanId = loanInsert.data?.id;
      if (loanInsert.error || !loanId) throw loanInsert.error ?? new Error("Gagal membuat kontrak pinjaman");
      try {
        await postJournal({
          tanggal: loanForm.tanggal_pencairan,
          keterangan: `Pencairan pinjaman anggota`,
          business_unit_id: unitId,
          source: "usp_loan_disbursement",
          source_ref: loanId,
          user_id: user?.id ?? undefined,
          lines: [
            { account_id: accounts.piutang!.id, debit: loanForm.jumlah_pinjaman, kredit: 0, keterangan: "Piutang Pinjaman" },
            { account_id: loanForm.akun_kas, debit: 0, kredit: loanForm.jumlah_pinjaman, keterangan: "Kas/Bank USP" },
          ],
        });
      } catch (journalError) {
        await supabase.from("usp_loans").delete().eq("id", loanId);
        throw journalError;
      }
      toast.success("Pinjaman berhasil dicatat dan jurnal dibuat");
      setLoanForm({ member_id: "", tanggal_pencairan: todayISO(), jumlah_pinjaman: 0, bunga: 12, tenor: 12, akun_kas: loanForm.akun_kas });
      await loadAll();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan pinjaman");
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async () => {
    if (!selectedLoan) return toast.error("Pilih pinjaman yang akan dibayarkan");
    if (!paymentForm.total_bayar || paymentForm.total_bayar <= 0) return toast.error("Total bayar wajib lebih besar dari 0");
    if (!paymentForm.akun_kas) return toast.error("Pilih akun Kas/Bank USP");
    if (!accounts.piutang || !accounts.pendapatanBunga || !accounts.pendapatanDenda) return toast.error("Akun USP belum lengkap");
    const bunga = Math.round(selectedLoan.sisa_pinjaman * (selectedLoan.bunga_persen_per_tahun / 12 / 100));
    const denda = Math.max(0, paymentForm.denda || 0);
    const pokok = paymentForm.total_bayar - bunga - denda;
    if (pokok <= 0) return toast.error("Total bayar harus menutup minimal pokok+ bunga");
    if (pokok > selectedLoan.sisa_pinjaman + 0.5) return toast.error("Pokok angsuran tidak boleh melebihi sisa pinjaman");
    const newSisa = Math.max(0, Number((selectedLoan.sisa_pinjaman - pokok).toFixed(2)));
    setSaving(true);
    try {
      const installmentInsert = await supabase.from("usp_loan_installments").insert({
        loan_id: selectedLoan.id,
        tanggal_bayar: todayISO(),
        pokok,
        bunga,
        denda,
        total_bayar: paymentForm.total_bayar,
        business_unit_id: unitId,
      }).select("id").single();
      const installmentId = installmentInsert.data?.id;
      if (installmentInsert.error || !installmentId) throw installmentInsert.error ?? new Error("Gagal mencatat angsuran");
      try {
        await postJournal({
          tanggal: todayISO(),
          keterangan: `Pembayaran angsuran pinjaman`,
          business_unit_id: unitId,
          source: "usp_loan_installment",
          source_ref: installmentId,
          user_id: user?.id ?? undefined,
          lines: [
            { account_id: paymentForm.akun_kas, debit: paymentForm.total_bayar, kredit: 0, keterangan: "Kas/Bank USP" },
            { account_id: accounts.piutang!.id, debit: 0, kredit: pokok, keterangan: "Pengurangan Piutang Pinjaman" },
            { account_id: accounts.pendapatanBunga!.id, debit: 0, kredit: bunga, keterangan: "Pendapatan Bunga" },
            ...(denda > 0 ? [{ account_id: accounts.pendapatanDenda!.id, debit: 0, kredit: denda, keterangan: "Pendapatan Denda" }] : []),
          ],
        });
      } catch (journalError) {
        await supabase.from("usp_loan_installments").delete().eq("id", installmentId);
        throw journalError;
      }
      await supabase.from("usp_loans").update({
        sisa_pinjaman: newSisa,
        status: newSisa <= 0.5 ? "lunas" : selectedLoan.status,
      }).eq("id", selectedLoan.id);
      toast.success("Angsuran berhasil dicatat dan jurnal dibuat");
      setPaymentForm({ loan_id: "", total_bayar: 0, denda: 0, akun_kas: paymentForm.akun_kas });
      await loadAll();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan angsuran");
    } finally {
      setSaving(false);
    }
  };

  const createProvision = async () => {
    if (!installmentLoan) return toast.error("Pilih pinjaman untuk penyisihan");
    if (!provisionForm.jumlah || provisionForm.jumlah <= 0) return toast.error("Jumlah penyisihan wajib lebih besar dari 0");
    if (!accounts.bebanPenyisihan || !accounts.cadangan) return toast.error("Akun penyisihan USP belum lengkap");
    setSaving(true);
    try {
      const journalId = await postJournal({
        tanggal: todayISO(),
        keterangan: `Penyisihan piutang macet`,
        business_unit_id: unitId,
        source: "usp_provision",
        source_ref: installmentLoan.id,
        user_id: user?.id ?? undefined,
        lines: [
          { account_id: accounts.bebanPenyisihan.id, debit: provisionForm.jumlah, kredit: 0, keterangan: "Beban Penyisihan Piutang" },
          { account_id: accounts.cadangan.id, debit: 0, kredit: provisionForm.jumlah, keterangan: "Cadangan Kerugian Piutang" },
        ],
      });
      await supabase.from("usp_loans").update({
        status: provisionForm.set_macet ? "macet" : installmentLoan.status,
      }).eq("id", installmentLoan.id);
      toast.success("Penyisihan piutang dicatat dan jurnal dibuat");
      setProvisionForm({ loan_id: "", jumlah: 0, set_macet: false });
      await loadAll();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal mencatat penyisihan");
    } finally {
      setSaving(false);
    }
  };

  const activeUnitOptions = spUnits;

  if (loading) {
    return (
      <div className="p-6 grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!unitId && activeUnitOptions.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold">Unit Simpan Pinjam</h1>
          <p className="text-sm text-muted-foreground mt-2">Belum ada unit usaha Simpan Pinjam. Tambahkan unit Simpan Pinjam di halaman Unit Usaha terlebih dahulu.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Unit Simpan Pinjam (USP)</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Modul Simpan Pinjam terpusat untuk unit USP. Semua transaksi USP sekarang diakses dari satu modul unit.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Unit Simpan Pinjam</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih unit USP" />
                </SelectTrigger>
                <SelectContent>
                  {activeUnitOptions.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.kode} — {unit.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status Validasi</Label>
              <div className="rounded-md border px-3 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Total Pinjaman tersisa:</span>
                  <span>{formatRp(totalOutstanding)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Saldo Piutang Pinjaman:</span>
                  <span>{formatRp(piutangSaldo)}</span>
                </div>
                <div className={accountMismatch ? "text-destructive" : "text-emerald-700"}>
                  {accountMismatch
                    ? "⚠️ Selisih saldo piutang pinjaman dan total sisa pinjaman!"
                    : "✔ Total sisa pinjaman seimbang dengan saldo akun Piutang Pinjaman."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Anggota</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola daftar anggota simpan pinjam secara terpisah untuk setiap unit USP.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/unit/usp">
              <Button size="sm">Menu Anggota</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <HandCoins className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Pinjaman</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Akses modul pinjaman dengan jurnal pencairan dan perhitungan angsuran otomatis.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/unit/usp">
              <Button size="sm">Menu Pinjaman</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Buku Besar</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Lihat buku besar unit USP dengan filter unit otomatis.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/buku-besar">
              <Button size="sm">Buka Buku Besar</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Laporan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Laporan keuangan USP terfilter berdasarkan unit yang dipilih.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/laporan">
              <Button size="sm">Buka Laporan</Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-5 border">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Catatan</h2>
          <p className="text-sm text-muted-foreground">
            Unit USP kini tampil sebagai modul unit penuh. Menu global USP di sidebar sudah digantikan dengan tombol dan navigasi internal unit.
          </p>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="anggota">
            <Users className="mr-2 h-4 w-4" /> Anggota
          </TabsTrigger>
          <TabsTrigger value="pinjaman">
            <HandCoins className="mr-2 h-4 w-4" /> Pinjaman
          </TabsTrigger>
          <TabsTrigger value="angsuran">
            <CreditCard className="mr-2 h-4 w-4" /> Angsuran
          </TabsTrigger>
          <TabsTrigger value="penyisihan">
            <ShieldCheck className="mr-2 h-4 w-4" /> Penyisihan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anggota">
          <Card className="p-6 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Nama Anggota</Label>
                <Input value={memberForm.nama} onChange={(e) => setMemberForm({ ...memberForm, nama: e.target.value })} />
              </div>
              <div>
                <Label>Alamat</Label>
                <Input value={memberForm.alamat} onChange={(e) => setMemberForm({ ...memberForm, alamat: e.target.value })} />
              </div>
              <div>
                <Label>No. HP</Label>
                <Input value={memberForm.no_hp} onChange={(e) => setMemberForm({ ...memberForm, no_hp: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={createMember} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambah Anggota"}</Button>
              <Badge variant="secondary">Anggota baru akan dicatat untuk unit USP ini</Badge>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Daftar Anggota</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Daftar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada anggota USP.</TableCell>
                  </TableRow>
                ) : members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.nama}</TableCell>
                    <TableCell>{member.no_hp || "-"}</TableCell>
                    <TableCell>{member.tanggal_daftar}</TableCell>
                    <TableCell>
                      <Badge variant={member.status_aktif ? "secondary" : "outline"}>
                        {member.status_aktif ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pinjaman">
          <Card className="p-6 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Anggota</Label>
                <Select value={loanForm.member_id} onValueChange={(value) => setLoanForm({ ...loanForm, member_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih anggota" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>{member.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tanggal Pencairan</Label>
                <Input type="date" value={loanForm.tanggal_pencairan} onChange={(e) => setLoanForm({ ...loanForm, tanggal_pencairan: e.target.value })} />
              </div>
              <div>
                <Label>Sumber Kas/Bank USP</Label>
                <Select value={loanForm.akun_kas} onValueChange={(value) => setLoanForm({ ...loanForm, akun_kas: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun" />
                  </SelectTrigger>
                  <SelectContent>
                    {savingsAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.kode_akun} — {acc.nama_akun}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Jumlah Pinjaman</Label>
                <Input type="number" value={loanForm.jumlah_pinjaman} onChange={(e) => setLoanForm({ ...loanForm, jumlah_pinjaman: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Bunga per Tahun (%)</Label>
                <Input type="number" value={loanForm.bunga} onChange={(e) => setLoanForm({ ...loanForm, bunga: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Tenor (bulan)</Label>
                <Input type="number" value={loanForm.tenor} onChange={(e) => setLoanForm({ ...loanForm, tenor: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="text-sm text-muted-foreground">
                Estimasi angsuran per bulan: <strong>{formatRp(calculateMonthlyPayment(loanForm.jumlah_pinjaman, loanForm.bunga, loanForm.tenor))}</strong>
              </div>
              <Button onClick={createLoan} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat Pinjaman"}</Button>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Daftar Pinjaman</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anggota</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenor</TableHead>
                  <TableHead>Angsuran/bln</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada pinjaman tercatat.</TableCell>
                  </TableRow>
                ) : loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.member?.nama ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(loan.jumlah_pinjaman)}</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(loan.sisa_pinjaman)}</TableCell>
                    <TableCell>
                      <Badge variant={loan.status === "aktif" ? "secondary" : loan.status === "lunas" ? "default" : "destructive"}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{loan.tenor_bulan} bulan</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(loan.angsuran_per_bulan)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="angsuran">
          <Card className="p-6 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Pinjaman</Label>
                <Select value={paymentForm.loan_id} onValueChange={(value) => setPaymentForm({ ...paymentForm, loan_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pinjaman" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLoans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>{loan.member?.nama ?? loan.id} — {formatRp(loan.sisa_pinjaman)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Total Bayar</Label>
                <Input type="number" value={paymentForm.total_bayar} onChange={(e) => setPaymentForm({ ...paymentForm, total_bayar: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Denda (opsional)</Label>
                <Input type="number" value={paymentForm.denda} onChange={(e) => setPaymentForm({ ...paymentForm, denda: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Terima di Kas/Bank USP</Label>
                <Select value={paymentForm.akun_kas} onValueChange={(value) => setPaymentForm({ ...paymentForm, akun_kas: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun" />
                  </SelectTrigger>
                  <SelectContent>
                    {savingsAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.kode_akun} — {acc.nama_akun}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border p-4 bg-muted/10">
                <div className="text-sm text-muted-foreground mb-2">Estimasi bunga bulan ini</div>
                <div className="text-lg font-semibold">
                  {selectedLoan ? formatRp(Math.round(selectedLoan.sisa_pinjaman * (selectedLoan.bunga_persen_per_tahun / 12 / 100))) : "-"}
                </div>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <Button onClick={recordPayment} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Catat Pembayaran"}</Button>
              <span className="text-sm text-muted-foreground">Sistem akan memisahkan pokok, bunga, dan denda secara otomatis.</span>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Riwayat Angsuran</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Anggota</TableHead>
                  <TableHead className="text-right">Pokok</TableHead>
                  <TableHead className="text-right">Bunga</TableHead>
                  <TableHead className="text-right">Denda</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada pembayaran angsuran.</TableCell>
                  </TableRow>
                ) : installments.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell>{inst.tanggal_bayar}</TableCell>
                    <TableCell>{inst.loan?.member?.nama ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(inst.pokok)}</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(inst.bunga)}</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(inst.denda)}</TableCell>
                    <TableCell className="text-right font-mono">{formatRp(inst.total_bayar)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="penyisihan">
          <Card className="p-6 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Pinjaman</Label>
                <Select value={provisionForm.loan_id} onValueChange={(value) => setProvisionForm({ ...provisionForm, loan_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pinjaman" />
                  </SelectTrigger>
                  <SelectContent>
                    {loans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>{loan.member?.nama ?? loan.id} — {formatRp(loan.sisa_pinjaman)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah Penyisihan</Label>
                <Input type="number" value={provisionForm.jumlah} onChange={(e) => setProvisionForm({ ...provisionForm, jumlah: Number(e.target.value) })} />
              </div>
              <div className="flex flex-col justify-end">
                <Label className="opacity-0">_</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="checkbox"
                    checked={provisionForm.set_macet}
                    onChange={(e) => setProvisionForm({ ...provisionForm, set_macet: e.target.checked })}
                  />
                  <span className="text-sm">Tandai pinjaman sebagai macet</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <Button onClick={createProvision} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat Penyisihan"}</Button>
              <span className="text-sm text-muted-foreground">Transaksi ini akan membuat jurnal cadangan kerugian piutang.</span>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <AlertCircle className="h-4 w-4" /> Riwayat jurnal penyisihan ditampilkan di daftar jurnal umum.
            </div>
            <div className="text-sm text-muted-foreground">Gunakan laporan keuangan untuk melihat efek ke neraca dan laba rugi USP.</div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
