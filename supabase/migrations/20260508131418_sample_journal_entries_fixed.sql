-- Sample journal entries for testing reports and general ledger
-- This migration adds sample data to demonstrate reporting functionality

-- Sample journal entries for testing reports and general ledger
-- This migration adds sample data to demonstrate reporting functionality

-- Insert sample journals for different business units
INSERT INTO journals (id, tanggal, nomor_jurnal, keterangan, status, business_unit_id, created_at, updated_at) VALUES
-- Unit Dagang transactions
(gen_random_uuid(), '2024-05-01', 'JU/2024/05/001', 'Modal awal unit dagang', 'posted', '137fae20-bf2f-4fc7-b377-aed09f466fb9', now(), now()),
(gen_random_uuid(), '2024-05-02', 'JU/2024/05/002', 'Pembelian persediaan barang dagang', 'posted', '137fae20-bf2f-4fc7-b377-aed09f466fb9', now(), now()),
(gen_random_uuid(), '2024-05-03', 'JU/2024/05/003', 'Penjualan barang dagang', 'posted', '137fae20-bf2f-4fc7-b377-aed09f466fb9', now(), now()),

-- Unit Jasa transactions
(gen_random_uuid(), '2024-05-01', 'JU/2024/05/004', 'Modal awal unit jasa', 'posted', 'a1e63943-a282-42ea-ace6-924206a950c3', now(), now()),
(gen_random_uuid(), '2024-05-04', 'JU/2024/05/005', 'Pendapatan jasa konsultasi', 'posted', 'a1e63943-a282-42ea-ace6-924206a950c3', now(), now()),

-- Unit Simpan Pinjam transactions
(gen_random_uuid(), '2024-05-01', 'JU/2024/05/006', 'Modal awal USP', 'posted', '5488dee2-97b8-486f-a326-8624cba9d4c4', now(), now()),
(gen_random_uuid(), '2024-05-05', 'JU/2024/05/007', 'Penerimaan simpanan anggota', 'posted', '5488dee2-97b8-486f-a326-8624cba9d4c4', now(), now());

-- Journal lines for Unit Dagang - Modal awal
INSERT INTO journal_lines (id, journal_id, account_id, debit, kredit, keterangan, created_at)
SELECT
  gen_random_uuid(),
  j.id,
  a.id,
  CASE WHEN a.kode_akun = '1.1.01.01' THEN 10000000 ELSE 0 END,
  CASE WHEN a.kode_akun = '3.1.01.01' THEN 10000000 ELSE 0 END,
  'Modal awal unit dagang',
  now()
FROM journals j
CROSS JOIN accounts a
WHERE j.nomor_jurnal = 'JU/2024/05/001'
  AND a.kode_akun IN ('1.1.01.01', '3.1.01.01');

-- Journal lines for Unit Dagang - Pembelian persediaan
INSERT INTO journal_lines (id, journal_id, account_id, debit, kredit, keterangan, created_at)
SELECT
  gen_random_uuid(),
  j.id,
  a.id,
  CASE WHEN a.kode_akun = '1.1.05.01' THEN 5000000 ELSE 0 END,
  CASE WHEN a.kode_akun = '1.1.01.01' THEN 5000000 ELSE 0 END,
  'Pembelian persediaan barang dagang',
  now()
FROM journals j
CROSS JOIN accounts a
WHERE j.nomor_jurnal = 'JU/2024/05/002'
  AND a.kode_akun IN ('1.1.05.01', '1.1.01.01');

-- Journal lines for Unit Dagang - Penjualan
INSERT INTO journal_lines (id, journal_id, account_id, debit, kredit, keterangan, created_at)
SELECT
  gen_random_uuid(),
  j.id,
  a.id,
  CASE
    WHEN a.kode_akun = '1.1.01.01' THEN 7500000
    WHEN a.kode_akun = '4.1.01.01' THEN 7500000
    ELSE 0
  END,
  CASE
    WHEN a.kode_akun = '1.1.05.01' THEN 5000000
    WHEN a.kode_akun = '5.1.01.01' THEN 2500000
    ELSE 0
  END,
  'Penjualan barang dagang',
  now()
FROM journals j
CROSS JOIN accounts a
WHERE j.nomor_jurnal = 'JU/2024/05/003'
  AND a.kode_akun IN ('1.1.01.01', '1.1.05.01', '4.1.01.01', '5.1.01.01');

-- Journal lines for Unit Jasa - Modal awal
INSERT INTO journal_lines (id, journal_id, account_id, debit, kredit, keterangan, created_at)
SELECT
  gen_random_uuid(),
  j.id,
  a.id,
  CASE WHEN a.kode_akun = '1.1.01.01' THEN 8000000 ELSE 0 END,
  CASE WHEN a.kode_akun = '3.1.01.01' THEN 8000000 ELSE 0 END,
  'Modal awal unit jasa',
  now()
FROM journals j
CROSS JOIN accounts a
WHERE j.nomor_jurnal = 'JU/2024/05/004'
  AND a.kode_akun IN ('1.1.01.01', '3.1.01.01');

-- Journal lines for Unit Jasa - Pendapatan jasa
INSERT INTO journal_lines (id, journal_id, account_id, debit, kredit, keterangan, created_at)
SELECT
  gen_random_uuid(),
  j.id,
  a.id,
  CASE WHEN a.kode_akun = '1.1.01.01' THEN 3000000 ELSE 0 END,
  CASE WHEN a.kode_akun = '4.1.05.01' THEN 3000000 ELSE 0 END,
  'Pendapatan jasa konsultasi',
  now()
FROM journals j
CROSS JOIN accounts a
WHERE j.nomor_jurnal = 'JU/2024/05/005'
  AND a.kode_akun IN ('1.1.01.01', '4.1.05.01');

-- Journal lines for Unit Simpan Pinjam - Modal awal
INSERT INTO journal_lines (id, journal_id, account_id, debit, kredit, keterangan, created_at)
SELECT
  gen_random_uuid(),
  j.id,
  a.id,
  CASE WHEN a.kode_akun = '1.1.01.06' THEN 15000000 ELSE 0 END,
  CASE WHEN a.kode_akun = '3.1.03.01' THEN 15000000 ELSE 0 END,
  'Modal awal USP',
  now()
FROM journals j
CROSS JOIN accounts a
WHERE j.nomor_jurnal = 'JU/2024/05/006'
  AND a.kode_akun IN ('1.1.01.06', '3.1.03.01');

-- Journal lines for Unit Simpan Pinjam - Penerimaan simpanan
INSERT INTO journal_lines (id, journal_id, account_id, debit, kredit, keterangan, created_at)
SELECT
  gen_random_uuid(),
  j.id,
  a.id,
  CASE WHEN a.kode_akun = '1.1.01.06' THEN 5000000 ELSE 0 END,
  CASE WHEN a.kode_akun = '2.1.01.01' THEN 5000000 ELSE 0 END,
  'Penerimaan simpanan anggota',
  now()
FROM journals j
CROSS JOIN accounts a
WHERE j.nomor_jurnal = 'JU/2024/05/007'
  AND a.kode_akun IN ('1.1.01.06', '2.1.01.01');