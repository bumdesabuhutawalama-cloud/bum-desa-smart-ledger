-- =========================================================
-- Fix: link RK accounts to business units, seed templates
-- =========================================================

BEGIN;

-- 1) Add business_unit_id link on accounts (so RK Unit can be matched reliably)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_business_unit ON public.accounts(business_unit_id);

-- 2) Ensure RK Pusat (3.8.01.01) is correctly tagged as KREDIT (was DEBIT in seed - fix)
UPDATE public.accounts
SET normal_balance = 'KREDIT'::normal_balance
WHERE kode_akun = '3.8.01.01';

-- 3) Mark RK accounts (3.8.x for Pusat, 1.1.99.x for Unit) as system / non-manual
UPDATE public.accounts
SET is_system_account = true, is_manual_input = false
WHERE kode_akun LIKE '1.1.99.%' OR kode_akun LIKE '3.8.%' OR kode_akun LIKE '3.1.03.%';

-- 4) Deactivate stale RK Unit accounts that don't match any active business unit
UPDATE public.accounts a
SET is_active = false
WHERE a.kode_akun LIKE '1.1.99.%'
  AND a.is_header = false
  AND a.business_unit_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.business_units bu
    WHERE bu.is_active = true AND bu.is_default = false
      AND a.nama_akun ILIKE '%' || bu.nama || '%'
  );

-- 5) For each non-default active unit, ensure an RK Unit account exists and is linked
DO $$
DECLARE
  u RECORD;
  parent_id_val uuid;
  existing_id uuid;
  next_seq int;
  new_kode text;
BEGIN
  SELECT id INTO parent_id_val FROM public.accounts WHERE kode_akun = '1.1.99.00';
  IF parent_id_val IS NULL THEN RETURN; END IF;

  FOR u IN
    SELECT id, kode, nama FROM public.business_units
    WHERE is_active = true AND is_default = false
  LOOP
    SELECT id INTO existing_id FROM public.accounts
    WHERE kode_akun LIKE '1.1.99.%' AND is_header = false
      AND (business_unit_id = u.id OR nama_akun ILIKE '%' || u.nama || '%')
    ORDER BY (business_unit_id = u.id) DESC
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE public.accounts
      SET business_unit_id = u.id, is_active = true,
          nama_akun = 'RK ' || u.nama
      WHERE id = existing_id;
    ELSE
      SELECT COALESCE(MAX(CAST(split_part(kode_akun,'.',4) AS int)), 0) + 1
        INTO next_seq
      FROM public.accounts
      WHERE kode_akun LIKE '1.1.99.%' AND is_header = false;

      new_kode := '1.1.99.' || lpad(next_seq::text, 2, '0');

      INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, business_unit_id, description)
      VALUES (new_kode, 'RK ' || u.nama, 'ASET', 'DEBIT', false, 4, parent_id_val, true, true, false, u.id,
              'Akun RK otomatis untuk transfer antar unit (' || u.kode || ')');
    END IF;
  END LOOP;
END $$;

-- 6) Re-seed activity_templates if missing
INSERT INTO public.activity_templates (business_type, code, name, description, icon, sort_order, fields, lines, keterangan_template) VALUES

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

('Aset & Modal', 'AM_BELANJA_ASET', 'Belanja Aset Tetap', 'Pembelian aset tetap. Debit Aset Tetap, Kredit Kas.', 'Building2', 60,
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
 'Pembagian SHU/Prive: {keterangan_shu}')
ON CONFLICT (code) DO NOTHING;

COMMIT;