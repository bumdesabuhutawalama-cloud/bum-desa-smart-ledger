BEGIN;

-- USP Master Data Tables
CREATE TABLE IF NOT EXISTS public.usp_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  alamat TEXT,
  no_hp TEXT,
  tanggal_daftar DATE NOT NULL DEFAULT now(),
  status_aktif BOOLEAN NOT NULL DEFAULT true,
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usp_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.usp_members(id) ON DELETE CASCADE,
  tanggal_pencairan DATE NOT NULL,
  jumlah_pinjaman NUMERIC(18,2) NOT NULL,
  bunga_persen_per_tahun NUMERIC(10,4) NOT NULL,
  tenor_bulan INT NOT NULL,
  angsuran_per_bulan NUMERIC(18,2) NOT NULL,
  sisa_pinjaman NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'aktif',
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jumlah_pinjaman >= 0),
  CHECK (sisa_pinjaman >= 0),
  CHECK (tenor_bulan > 0),
  CHECK (bunga_persen_per_tahun >= 0),
  CHECK (status IN ('aktif','lunas','macet'))
);

CREATE TABLE IF NOT EXISTS public.usp_loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.usp_loans(id) ON DELETE CASCADE,
  tanggal_bayar DATE NOT NULL,
  pokok NUMERIC(18,2) NOT NULL DEFAULT 0,
  bunga NUMERIC(18,2) NOT NULL DEFAULT 0,
  denda NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_bayar NUMERIC(18,2) NOT NULL DEFAULT 0,
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (pokok >= 0),
  CHECK (bunga >= 0),
  CHECK (denda >= 0),
  CHECK (total_bayar >= 0)
);

CREATE OR REPLACE FUNCTION public.update_usp_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_usp_members_updated BEFORE UPDATE ON public.usp_members
FOR EACH ROW EXECUTE FUNCTION public.update_usp_updated_at_column();

CREATE TRIGGER trg_usp_loans_updated BEFORE UPDATE ON public.usp_loans
FOR EACH ROW EXECUTE FUNCTION public.update_usp_updated_at_column();

CREATE TRIGGER trg_usp_loan_installments_updated BEFORE UPDATE ON public.usp_loan_installments
FOR EACH ROW EXECUTE FUNCTION public.update_usp_updated_at_column();

-- USP accounting accounts
DO $$
DECLARE
  v_parent_kas uuid;
  v_parent_piutang uuid;
  v_parent_penyisihan uuid;
  v_parent_rk uuid;
  v_parent_modal uuid;
  v_parent_saldo_laba uuid;
  v_parent_pendapatan_usp uuid;
  v_parent_beban_penyisihan uuid;
BEGIN
  SELECT id INTO v_parent_kas FROM public.accounts WHERE kode_akun = '1.1.01.00' LIMIT 1;
  SELECT id INTO v_parent_piutang FROM public.accounts WHERE kode_akun = '1.1.03.00' LIMIT 1;
  SELECT id INTO v_parent_penyisihan FROM public.accounts WHERE kode_akun = '1.1.04.00' LIMIT 1;
  SELECT id INTO v_parent_rk FROM public.accounts WHERE kode_akun = '3.8.01.00' LIMIT 1;
  SELECT id INTO v_parent_modal FROM public.accounts WHERE kode_akun = '3.1.00.00' LIMIT 1;
  SELECT id INTO v_parent_saldo_laba FROM public.accounts WHERE kode_akun = '3.3.01.00' LIMIT 1;
  SELECT id INTO v_parent_pendapatan_usp FROM public.accounts WHERE kode_akun = '4.1.08.00' LIMIT 1;
  SELECT id INTO v_parent_beban_penyisihan FROM public.accounts WHERE kode_akun = '6.1.07.00' LIMIT 1;

  IF v_parent_kas IS NOT NULL THEN
    INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, description)
    VALUES
      ('1.1.01.06', 'Kas USP', 'ASET'::account_type, 'DEBIT'::normal_balance, false, 4, v_parent_kas, true, false, true, 'Kas unit Simpan Pinjam'),
      ('1.1.01.07', 'Bank USP', 'ASET'::account_type, 'DEBIT'::normal_balance, false, 4, v_parent_kas, true, false, true, 'Bank unit Simpan Pinjam')
    ON CONFLICT (kode_akun) DO UPDATE SET nama_akun = EXCLUDED.nama_akun, tipe_akun = EXCLUDED.tipe_akun, normal_balance = EXCLUDED.normal_balance, is_header = EXCLUDED.is_header, level = EXCLUDED.level, parent_id = EXCLUDED.parent_id, is_active = true, is_system_account = EXCLUDED.is_system_account, is_manual_input = EXCLUDED.is_manual_input, description = EXCLUDED.description;
  END IF;

  IF v_parent_piutang IS NOT NULL THEN
    INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, description)
    VALUES
      ('1.1.03.03', 'Piutang Pinjaman', 'ASET'::account_type, 'DEBIT'::normal_balance, false, 4, v_parent_piutang, true, false, true, 'Piutang pinjaman anggota'),
      ('1.1.04.03', 'Cadangan Kerugian Piutang', 'ASET'::account_type, 'KREDIT'::normal_balance, false, 4, v_parent_penyisihan, true, false, true, 'Cadangan kerugian piutang pinjaman')
    ON CONFLICT (kode_akun) DO UPDATE SET nama_akun = EXCLUDED.nama_akun, tipe_akun = EXCLUDED.tipe_akun, normal_balance = EXCLUDED.normal_balance, is_header = EXCLUDED.is_header, level = EXCLUDED.level, parent_id = EXCLUDED.parent_id, is_active = true, is_system_account = EXCLUDED.is_system_account, is_manual_input = EXCLUDED.is_manual_input, description = EXCLUDED.description;
  END IF;

  IF v_parent_rk IS NOT NULL THEN
    INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, description)
    VALUES
      ('3.8.01.02', 'RK Pusat - USP', 'EKUITAS'::account_type, 'KREDIT'::normal_balance, false, 4, v_parent_rk, true, false, true, 'Rekening Koresponden Pusat untuk Unit Simpan Pinjam')
    ON CONFLICT (kode_akun) DO UPDATE SET nama_akun = EXCLUDED.nama_akun, tipe_akun = EXCLUDED.tipe_akun, normal_balance = EXCLUDED.normal_balance, is_header = EXCLUDED.is_header, level = EXCLUDED.level, parent_id = EXCLUDED.parent_id, is_active = true, is_system_account = EXCLUDED.is_system_account, is_manual_input = EXCLUDED.is_manual_input, description = EXCLUDED.description;
  END IF;

  IF v_parent_modal IS NOT NULL THEN
    INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, description)
    VALUES
      ('3.1.03.01', 'Modal USP', 'EKUITAS'::account_type, 'KREDIT'::normal_balance, false, 4, v_parent_modal, true, false, true, 'Modal unit Simpan Pinjam'),
      ('3.3.01.04', 'Laba Ditahan USP', 'EKUITAS'::account_type, 'KREDIT'::normal_balance, false, 4, v_parent_saldo_laba, true, false, true, 'Laba ditahan unit Simpan Pinjam'),
      ('3.3.01.05', 'Laba Berjalan USP', 'EKUITAS'::account_type, 'KREDIT'::normal_balance, false, 4, v_parent_saldo_laba, true, false, true, 'Laba berjalan unit Simpan Pinjam')
    ON CONFLICT (kode_akun) DO UPDATE SET nama_akun = EXCLUDED.nama_akun, tipe_akun = EXCLUDED.tipe_akun, normal_balance = EXCLUDED.normal_balance, is_header = EXCLUDED.is_header, level = EXCLUDED.level, parent_id = EXCLUDED.parent_id, is_active = true, is_system_account = EXCLUDED.is_system_account, is_manual_input = EXCLUDED.is_manual_input, description = EXCLUDED.description;
  END IF;

  IF v_parent_pendapatan_usp IS NOT NULL THEN
    INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, description)
    VALUES
      ('4.1.08.02', 'Pendapatan Bunga USP', 'PENDAPATAN'::account_type, 'KREDIT'::normal_balance, false, 4, v_parent_pendapatan_usp, true, false, true, 'Pendapatan bunga pinjaman USP'),
      ('4.1.08.03', 'Pendapatan Denda USP', 'PENDAPATAN'::account_type, 'KREDIT'::normal_balance, false, 4, v_parent_pendapatan_usp, true, false, true, 'Pendapatan denda pinjaman USP')
    ON CONFLICT (kode_akun) DO UPDATE SET nama_akun = EXCLUDED.nama_akun, tipe_akun = EXCLUDED.tipe_akun, normal_balance = EXCLUDED.normal_balance, is_header = EXCLUDED.is_header, level = EXCLUDED.level, parent_id = EXCLUDED.parent_id, is_active = true, is_system_account = EXCLUDED.is_system_account, is_manual_input = EXCLUDED.is_manual_input, description = EXCLUDED.description;
  END IF;

  IF v_parent_beban_penyisihan IS NOT NULL THEN
    INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, description)
    VALUES
      ('6.1.07.07', 'Beban Penyisihan Piutang USP', 'BEBAN'::account_type, 'DEBIT'::normal_balance, false, 4, v_parent_beban_penyisihan, true, false, true, 'Beban penyisihan piutang unit Simpan Pinjam')
    ON CONFLICT (kode_akun) DO UPDATE SET nama_akun = EXCLUDED.nama_akun, tipe_akun = EXCLUDED.tipe_akun, normal_balance = EXCLUDED.normal_balance, is_header = EXCLUDED.is_header, level = EXCLUDED.level, parent_id = EXCLUDED.parent_id, is_active = true, is_system_account = EXCLUDED.is_system_account, is_manual_input = EXCLUDED.is_manual_input, description = EXCLUDED.description;
  END IF;
END$$;

-- USP activity templates update
INSERT INTO public.activity_templates (business_type, code, name, description, icon, sort_order, fields, lines, keterangan_template, is_active)
VALUES
('Simpan Pinjam', 'SP_PENCAIRAN', 'Pencairan Pinjaman', 'Mencairkan dana pinjaman ke anggota/nasabah. Debit Piutang Pinjaman, Kredit Kas/Bank USP.', 'HandCoins', 10,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_peminjam","label":"Nama Anggota","type":"text","required":true},
   {"key":"pokok","label":"Jumlah Pinjaman (Rp)","type":"number","required":true,"helper":"Jumlah uang yang dicairkan"},
   {"key":"akun_kas","label":"Sumber Dana (Kas/Bank USP)","type":"account","required":true,"account_filter":"KAS_USP"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"lookup":"PIUTANG_PINJAMAN"},"amount":{"from_field":"pokok"},"keterangan":"Pencairan ke {nama_peminjam}"},
   {"side":"kredit","account":{"from_field":"akun_kas"},"amount":{"from_field":"pokok"},"keterangan":"Pencairan ke {nama_peminjam}"}
 ]'::jsonb,
 'Pencairan pinjaman kepada {nama_peminjam}', true)
ON CONFLICT (code) DO UPDATE SET
  business_type = EXCLUDED.business_type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  fields = EXCLUDED.fields,
  lines = EXCLUDED.lines,
  keterangan_template = EXCLUDED.keterangan_template,
  is_active = EXCLUDED.is_active;

INSERT INTO public.activity_templates (business_type, code, name, description, icon, sort_order, fields, lines, keterangan_template, is_active)
VALUES
('Simpan Pinjam', 'SP_ANGSURAN', 'Terima Angsuran Pinjaman', 'Menerima pembayaran angsuran. Debit Kas/Bank USP, Kredit Piutang Pinjaman, Kredit Pendapatan Bunga, dan Kredit Pendapatan Denda jika ada.', 'Coins', 11,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_peminjam","label":"Nama Anggota","type":"text","required":true},
   {"key":"pokok","label":"Pokok Angsuran (Rp)","type":"number","required":true},
   {"key":"bunga","label":"Bunga (Rp)","type":"number","required":false,"helper":"Kosongkan jika tidak ada bunga"},
   {"key":"denda","label":"Denda (Rp)","type":"number","required":false,"helper":"Kosongkan jika tidak ada denda"},
   {"key":"akun_kas","label":"Diterima di (Kas/Bank USP)","type":"account","required":true,"account_filter":"KAS_USP"}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"from_field":"akun_kas"},"amount":{"formula":"pokok + bunga + denda"},"keterangan":"Angsuran dari {nama_peminjam}"},
   {"side":"kredit","account":{"lookup":"PIUTANG_PINJAMAN"},"amount":{"from_field":"pokok"},"keterangan":"Pokok angsuran {nama_peminjam}"},
   {"side":"kredit","account":{"lookup":"PENDAPATAN_BUNGA"},"amount":{"from_field":"bunga"},"condition":{"field":"bunga","op":">","value":0},"keterangan":"Bunga pinjaman {nama_peminjam}"},
   {"side":"kredit","account":{"lookup":"PENDAPATAN_DENDA"},"amount":{"from_field":"denda"},"condition":{"field":"denda","op":">","value":0},"keterangan":"Denda pinjaman {nama_peminjam}"}
 ]'::jsonb,
 'Penerimaan angsuran dari {nama_peminjam}', true)
ON CONFLICT (code) DO UPDATE SET
  business_type = EXCLUDED.business_type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  fields = EXCLUDED.fields,
  lines = EXCLUDED.lines,
  keterangan_template = EXCLUDED.keterangan_template,
  is_active = EXCLUDED.is_active;

INSERT INTO public.activity_templates (business_type, code, name, description, icon, sort_order, fields, lines, keterangan_template, is_active)
VALUES
('Simpan Pinjam', 'SP_PENYISIHAN', 'Penyisihan Piutang', 'Mencatat penyisihan kredit macet. Debit Beban Penyisihan Piutang, Kredit Cadangan Kerugian Piutang.', 'ShieldCheck', 13,
 '[
   {"key":"tanggal","label":"Tanggal","type":"date","required":true},
   {"key":"nama_debitur","label":"Nama Debitur","type":"text","required":true},
   {"key":"jumlah","label":"Jumlah Penyisihan (Rp)","type":"number","required":true},
   {"key":"keterangan","label":"Keterangan","type":"text","required":false}
 ]'::jsonb,
 '[
   {"side":"debit","account":{"lookup":"BEBAN_PENYISIHAN_PIUTANG"},"amount":{"from_field":"jumlah"},"keterangan":"Penyisihan piutang {nama_debitur}"},
   {"side":"kredit","account":{"lookup":"CADANGAN_KERUGIAN_PIUTANG"},"amount":{"from_field":"jumlah"},"keterangan":"Penyisihan piutang {nama_debitur}"}
 ]'::jsonb,
 'Penyisihan kredit macet {nama_debitur}', true)
ON CONFLICT (code) DO UPDATE SET
  business_type = EXCLUDED.business_type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  fields = EXCLUDED.fields,
  lines = EXCLUDED.lines,
  keterangan_template = EXCLUDED.keterangan_template,
  is_active = EXCLUDED.is_active;

COMMIT;
