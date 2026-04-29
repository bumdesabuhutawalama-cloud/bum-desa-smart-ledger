
-- Tabel definisi template kegiatan
CREATE TABLE public.activity_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type text NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'Sparkles',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  keterangan_template text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates read auth" ON public.activity_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Templates manage admin" ON public.activity_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_activity_templates_updated_at
BEFORE UPDATE ON public.activity_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabel entri kegiatan (audit trail layer kegiatan)
CREATE TABLE public.activity_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.activity_templates(id) ON DELETE RESTRICT,
  journal_id uuid NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_entries_journal ON public.activity_entries(journal_id);
CREATE INDEX idx_activity_entries_template ON public.activity_entries(template_id);

ALTER TABLE public.activity_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entries read auth" ON public.activity_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Entries manage staff" ON public.activity_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'bendahara'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'bendahara'::app_role));

-- Seed 18 template kegiatan
-- Konvensi field: { key, label, type (number|text|date|select|account), required, helper, options?, account_filter? }
-- Konvensi lines: { side: 'debit'|'kredit', account: { lookup: 'KAS'|... } | { from_field: 'akun_kas' }, amount: { from_field: 'x' } | { formula: 'a+b' }, condition?: { field, op, value }, keterangan? }

INSERT INTO public.activity_templates (business_type, code, name, description, icon, sort_order, fields, lines, keterangan_template) VALUES

-- ===== SIMPAN PINJAM =====
('Simpan Pinjam', 'SP_PENCAIRAN', 'Pencairan Pinjaman', 'Mencairkan dana pinjaman ke anggota/nasabah. Sistem mencatat: Debit Piutang Usaha, Kredit Kas/Bank.', 'HandCoins', 10,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_peminjam","label":"Nama Peminjam","type":"text","required":true},
   {"key":"pokok","label":"Jumlah Pinjaman (Rp)","type":"number","required":true,"helper":"Jumlah uang yang dicairkan"},
   {"key":"akun_kas","label":"Sumber Dana","type":"account","required":true,"account_filter":"KAS_BANK"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"lookup":"PIUTANG_USAHA"},"amount":{"from_field":"pokok"},"keterangan":"Pencairan ke {nama_peminjam}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"pokok"},"keterangan":"Pencairan ke {nama_peminjam}"}
 ]'::jsonb,
 'Pencairan pinjaman kepada {nama_peminjam}'),

('Simpan Pinjam', 'SP_ANGSURAN', 'Terima Angsuran (Pokok + Bunga)', 'Menerima pembayaran angsuran beserta bunga. Sistem mencatat: Debit Kas, Kredit Piutang (pokok), Kredit Pendapatan Bunga.', 'Coins', 11,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_peminjam","label":"Nama Peminjam","type":"text","required":true},
   {"key":"pokok","label":"Pokok Angsuran (Rp)","type":"number","required":true},
   {"key":"bunga","label":"Bunga (Rp)","type":"number","required":false,"helper":"Kosongkan jika tidak ada bunga"},
   {"key":"akun_kas","label":"Diterima di","type":"account","required":true,"account_filter":"KAS_BANK"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_kas"},"amount":{"formula":"pokok + bunga"},"keterangan":"Angsuran dari {nama_peminjam}"},
   {"side":"kredit","account":{"lookup":"PIUTANG_USAHA"},"amount":{"from_field":"pokok"},"keterangan":"Pokok angsuran {nama_peminjam}"},
   {"side":"kredit","account":{"lookup":"PENDAPATAN_BUNGA"},"amount":{"from_field":"bunga"},"condition":{"field":"bunga","op":">","value":0},"keterangan":"Bunga pinjaman {nama_peminjam}"}
 ]'::jsonb,
 'Penerimaan angsuran dari {nama_peminjam}'),

('Simpan Pinjam', 'SP_PELUNASAN', 'Pelunasan Pinjaman', 'Pelunasan sisa pinjaman sekaligus. Sistem mencatat: Debit Kas, Kredit Piutang, Kredit Pendapatan Bunga (jika ada).', 'CheckCircle2', 12,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_peminjam","label":"Nama Peminjam","type":"text","required":true},
   {"key":"sisa_pokok","label":"Sisa Pokok (Rp)","type":"number","required":true},
   {"key":"bunga","label":"Bunga / Denda (Rp)","type":"number","required":false},
   {"key":"akun_kas","label":"Diterima di","type":"account","required":true,"account_filter":"KAS_BANK"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_kas"},"amount":{"formula":"sisa_pokok + bunga"},"keterangan":"Pelunasan {nama_peminjam}"},
   {"side":"kredit","account":{"lookup":"PIUTANG_USAHA"},"amount":{"from_field":"sisa_pokok"},"keterangan":"Pelunasan pokok {nama_peminjam}"},
   {"side":"kredit","account":{"lookup":"PENDAPATAN_BUNGA"},"amount":{"from_field":"bunga"},"condition":{"field":"bunga","op":">","value":0},"keterangan":"Bunga pelunasan {nama_peminjam}"}
 ]'::jsonb,
 'Pelunasan pinjaman {nama_peminjam}'),

('Simpan Pinjam', 'SP_HAPUS_BUKU', 'Hapus Buku Piutang Macet', 'Menghapuskan piutang yang tidak tertagih. Sistem mencatat: Debit Penyisihan Piutang, Kredit Piutang Usaha.', 'XCircle', 13,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_debitur","label":"Nama Debitur","type":"text","required":true},
   {"key":"jumlah","label":"Jumlah Dihapus (Rp)","type":"number","required":true}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"lookup":"PENYISIHAN_PIUTANG"},"amount":{"from_field":"jumlah"},"keterangan":"Hapus buku {nama_debitur}"},
   {"side":"kredit","account":{"lookup":"PIUTANG_USAHA"},"amount":{"from_field":"jumlah"},"keterangan":"Hapus buku {nama_debitur}"}
 ]'::jsonb,
 'Penghapusan piutang macet {nama_debitur}'),

-- ===== PERDAGANGAN =====
('Perdagangan', 'PD_PENJUALAN_TUNAI', 'Penjualan Tunai', 'Penjualan barang/jasa tunai. Sistem mencatat: Debit Kas, Kredit Pendapatan.', 'ShoppingCart', 20,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"keterangan_jual","label":"Keterangan Penjualan","type":"text","required":true},
   {"key":"jumlah","label":"Total Penjualan (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Diterima di","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_pendapatan","label":"Akun Pendapatan","type":"account","required":true,"account_filter":"PENDAPATAN"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"{keterangan_jual}"},
   {"side":"kredit","account":{"from_field":"akun_pendapatan"},"amount":{"from_field":"jumlah"},"keterangan":"{keterangan_jual}"}
 ]'::jsonb,
 'Penjualan tunai: {keterangan_jual}'),

('Perdagangan', 'PD_PEMBELIAN', 'Pembelian Barang Dagangan', 'Membeli barang untuk dijual. Sistem mencatat: Debit Persediaan, Kredit Kas.', 'PackagePlus', 21,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_supplier","label":"Nama Supplier","type":"text","required":true},
   {"key":"jumlah","label":"Total Pembelian (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Dibayar dari","type":"account","required":true,"account_filter":"KAS_BANK"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"lookup":"PERSEDIAAN_DAGANG"},"amount":{"from_field":"jumlah"},"keterangan":"Pembelian dari {nama_supplier}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Pembelian dari {nama_supplier}"}
 ]'::jsonb,
 'Pembelian barang dagangan dari {nama_supplier}'),

('Perdagangan', 'PD_RETUR_JUAL', 'Retur Penjualan', 'Pengembalian barang oleh pembeli. Sistem mencatat: Debit Pendapatan (retur), Kredit Kas.', 'Undo2', 22,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"keterangan_retur","label":"Alasan Retur","type":"text","required":true},
   {"key":"jumlah","label":"Nilai Retur (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Dikembalikan dari","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_pendapatan","label":"Akun Pendapatan Asal","type":"account","required":true,"account_filter":"PENDAPATAN"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_pendapatan"},"amount":{"from_field":"jumlah"},"keterangan":"Retur: {keterangan_retur}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Retur: {keterangan_retur}"}
 ]'::jsonb,
 'Retur penjualan: {keterangan_retur}'),

-- ===== JASA & SEWA =====
('Jasa & Sewa', 'JS_JASA_TUNAI', 'Pendapatan Jasa Tunai', 'Menerima pembayaran jasa secara tunai. Debit Kas, Kredit Pendapatan Jasa.', 'Briefcase', 30,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"keterangan_jasa","label":"Jenis Jasa","type":"text","required":true},
   {"key":"jumlah","label":"Nilai Jasa (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Diterima di","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_pendapatan","label":"Akun Pendapatan","type":"account","required":true,"account_filter":"PENDAPATAN"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"{keterangan_jasa}"},
   {"side":"kredit","account":{"from_field":"akun_pendapatan"},"amount":{"from_field":"jumlah"},"keterangan":"{keterangan_jasa}"}
 ]'::jsonb,
 'Pendapatan jasa: {keterangan_jasa}'),

('Jasa & Sewa', 'JS_SEWA_DIMUKA', 'Terima Sewa Diterima Dimuka', 'Menerima pembayaran sewa untuk periode mendatang. Debit Kas, Kredit Sewa Diterima Dimuka (kewajiban).', 'CalendarClock', 31,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_penyewa","label":"Nama Penyewa","type":"text","required":true},
   {"key":"jumlah","label":"Jumlah Sewa (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Diterima di","type":"account","required":true,"account_filter":"KAS_BANK"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Sewa dari {nama_penyewa}"},
   {"side":"kredit","account":{"lookup":"SEWA_DITERIMA_DIMUKA"},"amount":{"from_field":"jumlah"},"keterangan":"Sewa diterima dimuka {nama_penyewa}"}
 ]'::jsonb,
 'Penerimaan sewa dimuka dari {nama_penyewa}'),

-- ===== AIR BERSIH / PAM =====
('Air Bersih / PAM', 'PAM_TAGIH', 'Tagih Pelanggan PAM (Akrual)', 'Menerbitkan tagihan air ke pelanggan (belum dibayar). Debit Piutang, Kredit Pendapatan Air.', 'Droplets', 40,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"periode","label":"Periode Tagihan","type":"text","required":true,"helper":"Contoh: April 2026"},
   {"key":"jumlah","label":"Total Tagihan (Rp)","type":"number","required":true},
   {"key":"akun_pendapatan","label":"Akun Pendapatan","type":"account","required":true,"account_filter":"PENDAPATAN"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"lookup":"PIUTANG_USAHA"},"amount":{"from_field":"jumlah"},"keterangan":"Tagihan PAM {periode}"},
   {"side":"kredit","account":{"from_field":"akun_pendapatan"},"amount":{"from_field":"jumlah"},"keterangan":"Pendapatan PAM {periode}"}
 ]'::jsonb,
 'Penerbitan tagihan PAM periode {periode}'),

('Air Bersih / PAM', 'PAM_BAYAR', 'Terima Pembayaran Tagihan PAM', 'Pelanggan membayar tagihan air. Debit Kas, Kredit Piutang Usaha.', 'Receipt', 41,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_pelanggan","label":"Nama Pelanggan","type":"text","required":true},
   {"key":"jumlah","label":"Jumlah Dibayar (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Diterima di","type":"account","required":true,"account_filter":"KAS_BANK"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Bayar PAM {nama_pelanggan}"},
   {"side":"kredit","account":{"lookup":"PIUTANG_USAHA"},"amount":{"from_field":"jumlah"},"keterangan":"Bayar PAM {nama_pelanggan}"}
 ]'::jsonb,
 'Pembayaran tagihan PAM dari {nama_pelanggan}'),

-- ===== OPERASIONAL =====
('Operasional', 'OP_GAJI', 'Bayar Gaji & Honor', 'Pembayaran gaji pengurus/karyawan. Debit Beban Gaji, Kredit Kas.', 'Users', 50,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"periode","label":"Periode","type":"text","required":true,"helper":"Contoh: April 2026"},
   {"key":"jumlah","label":"Total Gaji (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Dibayar dari","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_beban","label":"Akun Beban Gaji","type":"account","required":true,"account_filter":"BEBAN"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_beban"},"amount":{"from_field":"jumlah"},"keterangan":"Gaji {periode}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Pembayaran gaji {periode}"}
 ]'::jsonb,
 'Pembayaran gaji & honor periode {periode}'),

('Operasional', 'OP_UTILITAS', 'Bayar Listrik / Air / Internet', 'Pembayaran tagihan utilitas kantor. Debit Beban Utilitas, Kredit Kas.', 'Zap', 51,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"jenis","label":"Jenis Utilitas","type":"text","required":true,"helper":"Listrik/Air/Internet"},
   {"key":"jumlah","label":"Jumlah (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Dibayar dari","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_beban","label":"Akun Beban","type":"account","required":true,"account_filter":"BEBAN"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_beban"},"amount":{"from_field":"jumlah"},"keterangan":"Pembayaran {jenis}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Pembayaran {jenis}"}
 ]'::jsonb,
 'Pembayaran utilitas: {jenis}'),

('Operasional', 'OP_ATK', 'Belanja ATK / Operasional', 'Belanja perlengkapan kantor. Debit Beban Perlengkapan, Kredit Kas.', 'PencilRuler', 52,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"keterangan_belanja","label":"Keterangan Belanja","type":"text","required":true},
   {"key":"jumlah","label":"Jumlah (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Dibayar dari","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_beban","label":"Akun Beban","type":"account","required":true,"account_filter":"BEBAN"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_beban"},"amount":{"from_field":"jumlah"},"keterangan":"{keterangan_belanja}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"{keterangan_belanja}"}
 ]'::jsonb,
 'Belanja operasional: {keterangan_belanja}'),

('Operasional', 'OP_TRANSPORT', 'Bayar Transport & Perjalanan Dinas', 'Pengeluaran transport/perjalanan. Debit Beban Perjalanan, Kredit Kas.', 'Car', 53,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"keperluan","label":"Keperluan","type":"text","required":true},
   {"key":"jumlah","label":"Jumlah (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Dibayar dari","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_beban","label":"Akun Beban","type":"account","required":true,"account_filter":"BEBAN"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_beban"},"amount":{"from_field":"jumlah"},"keterangan":"Transport: {keperluan}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Transport: {keperluan}"}
 ]'::jsonb,
 'Pengeluaran transport/perjalanan: {keperluan}'),

-- ===== ASET & MODAL =====
('Aset & Modal', 'AM_BELANJA_ASET', 'Belanja Aset Tetap', 'Pembelian aset tetap (kendaraan, peralatan, dll). Debit Aset Tetap, Kredit Kas. Catatan: setelah ini, lengkapi data penyusutan di modul Aset Tetap.', 'Building2', 60,
 '[
   {"key":"tanggal","label":"Tanggal Perolehan","type":"date","required":true},
   {"key":"nama_aset","label":"Nama Aset","type":"text","required":true},
   {"key":"jumlah","label":"Harga Perolehan (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Dibayar dari","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_aset","label":"Akun Aset Tetap","type":"account","required":true,"account_filter":"ASET_TETAP"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_aset"},"amount":{"from_field":"jumlah"},"keterangan":"Pembelian {nama_aset}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Pembelian {nama_aset}"}
 ]'::jsonb,
 'Belanja aset tetap: {nama_aset}'),

('Aset & Modal', 'AM_SETOR_MODAL', 'Setoran Modal dari Pemerintah Desa', 'Penerimaan modal/penyertaan dari Pemdes. Debit Kas, Kredit Modal Disetor.', 'Landmark', 61,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"sumber","label":"Sumber Dana","type":"text","required":true,"helper":"Contoh: Penyertaan APBDes 2026"},
   {"key":"jumlah","label":"Jumlah Setoran (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Diterima di","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_modal","label":"Akun Modal","type":"account","required":true,"account_filter":"EKUITAS"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"Setoran modal: {sumber}"},
   {"side":"kredit","account":{"from_field":"akun_modal"},"amount":{"from_field":"jumlah"},"keterangan":"Setoran modal: {sumber}"}
 ]'::jsonb,
 'Penerimaan setoran modal: {sumber}'),

('Aset & Modal', 'AM_SHU', 'Pembagian SHU / Penarikan Pribadi', 'Pembagian Sisa Hasil Usaha. Debit Prive/SHU, Kredit Kas.', 'PiggyBank', 62,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"keterangan_shu","label":"Keterangan","type":"text","required":true,"helper":"Contoh: Pembagian SHU 2025"},
   {"key":"jumlah","label":"Jumlah (Rp)","type":"number","required":true},
   {"key":"akun_kas","label":"Dibayar dari","type":"account","required":true,"account_filter":"KAS_BANK"},
   {"key":"akun_ekuitas","label":"Akun Ekuitas (Prive/SHU)","type":"account","required":true,"account_filter":"EKUITAS"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_ekuitas"},"amount":{"from_field":"jumlah"},"keterangan":"{keterangan_shu}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"jumlah"},"keterangan":"{keterangan_shu}"}
 ]'::jsonb,
 'Pembagian SHU/Prive: {keterangan_shu}');
