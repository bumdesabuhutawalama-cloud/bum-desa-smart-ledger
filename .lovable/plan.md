# Refaktor Multi-Tenant per Unit Usaha

Refactor arsitektur dari single-login menjadi multi-tenant: setiap Unit Usaha (Jasa, Perdagangan, Simpan Pinjam, Pangan, Pusat) punya login sendiri dan data terisolasi. Unit Pusat (super_admin) bisa lihat konsolidasi semua unit.

## 1. Database — Multi-Tenant Foundation

### Tabel `business_units` (sudah ada)
Tambah kolom yang belum ada:
- `is_head_office BOOLEAN DEFAULT false` — true hanya untuk Unit Pusat

Pastikan ada baris untuk: PUSAT, DAGANG, JASA, SP, PANGAN.

### Enum role baru
Tambah role baru ke `app_role`:
- `super_admin` — Unit Pusat, full access
- `admin_unit` — admin dari satu unit
- `staff_unit` — staff dari satu unit

(role lama `admin`, `bendahara`, `auditor` tetap dipertahankan untuk backward-compat)

### Tabel `user_business_units` (baru)
Mapping user → unit (1 user = 1 unit, kecuali super_admin):
- `user_id UUID` (FK ke auth.users)
- `business_unit_id UUID` (FK ke business_units, nullable untuk super_admin)
- `role app_role`
- UNIQUE(user_id)

### Function helper baru
```sql
public.get_user_business_unit(_user_id) RETURNS uuid
public.is_super_admin(_user_id) RETURNS boolean
public.can_access_unit(_user_id, _unit_id) RETURNS boolean
```
Semua SECURITY DEFINER, untuk dipakai di RLS policies.

### Update RLS policies untuk SEMUA tabel transaksi
Tabel: `journals`, `journal_lines`, `accounts`, `assets`, `inventory_items`, `inventory_movements`, `payables`, `receivables`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `sales_orders`, `sales_order_items`, `activity_entries`, `usp_loans`, `usp_loan_installments`, `usp_members`, `suppliers`.

Policy baru (replace existing manage/read policies):
- **SELECT**: `is_super_admin(auth.uid()) OR business_unit_id = get_user_business_unit(auth.uid())`
- **INSERT/UPDATE/DELETE**: sama + cek role admin/bendahara

Untuk `journal_lines`, `purchase_order_items`, `sales_order_items` (tidak punya `business_unit_id` langsung): join via parent.

## 2. Auth & State Global

### Update `auth-context.tsx`
- Saat login, fetch `user_business_units` row
- Expose: `currentBusinessUnit`, `isSuperAdmin`, `isHeadOffice`
- Hapus dependency ke role lama untuk gating unit

### Update `unit-context.tsx`
- Untuk user non-super-admin: `currentUnitId` LOCKED ke `user.business_unit_id`, tidak bisa diubah
- Untuk super_admin: dropdown switch antar unit + opsi "Konsolidasi"
- Persist hanya untuk super_admin

### Middleware route guard
- `_app.tsx`: jika user bukan super_admin dan url unit ≠ unit user → redirect ke unit-nya
- Login per-unit (`/dagang/login`, `/jasa/login`, dst): setelah login cek user.business_unit, redirect ke dashboard unit yang sesuai

## 3. UI Changes

### `UnitSelector.tsx`
- Tampilkan HANYA jika `isSuperAdmin === true`
- Untuk user biasa: tampilkan label statis "Unit: [nama unit]" (read-only)

### Dashboard
- Dashboard unit (existing per-unit dashboard): tampil untuk user unit tsb
- Dashboard pusat (`_app.dashboard.tsx`): konsolidasi, hanya super_admin

### Halaman admin user (baru)
`/_app/users` — super_admin assign user ke unit + role.

## 4. Query Refactor

Semua query Supabase yang sebelumnya pakai `useUnit().currentUnitId` sudah otomatis ter-filter via RLS. Tetap pertahankan filter eksplisit `business_unit_id` untuk performa, tapi RLS jadi pengaman utama.

## 5. Yang TIDAK Diubah

- Struktur COA dan logika jurnal
- Logika konsolidasi laporan & RK antar unit
- Modul-modul existing (pembelian, penjualan, dll) — hanya diuntungkan dari RLS baru

## Urutan Eksekusi

1. **Migrasi DB**: tambah kolom, enum, tabel mapping, functions, update SEMUA RLS policies (1 migration besar)
2. **Seed**: buat 1 super_admin dari user existing yang punya role `admin`
3. **Refactor auth-context** + unit-context
4. **Update UnitSelector** + route guards
5. **Halaman manajemen user** (super_admin only)
6. **Test**: 4 skenario login (per unit + pusat)

## Catatan Teknis

- User existing: harus dipetakan manual ke unit. Buat halaman one-time setup untuk super_admin assign user.
- Edge function `ai-asisten`: perlu diupdate agar context unit user dikirim sebagai parameter.
- File `business-unit-context.tsx` lama: deprecate, alias ke `unit-context`.
- Migrasi DB satu kali besar agar konsisten — RLS lama di-drop dulu, lalu di-replace.

## Pertanyaan untuk Anda Sebelum Mulai

1. **User existing**: apakah ada user yang sudah dibuat dan harus di-mapping ke unit tertentu? Atau OK kalau saya buat semua user existing jadi `super_admin` Pusat sementara, lalu Anda re-assign manual lewat UI?
2. **Login per-unit**: apakah halaman `/dagang/login`, `/jasa/login`, dst tetap dipertahankan sebagai entry point terpisah, atau cukup 1 halaman login universal yang otomatis redirect ke unit user?
3. **Self-signup**: apakah user baru bisa register sendiri, atau hanya super_admin yang bisa create user baru?

Setelah Anda jawab 3 hal ini, saya langsung eksekusi migrasi DB + refactor code dalam satu rangkaian.
