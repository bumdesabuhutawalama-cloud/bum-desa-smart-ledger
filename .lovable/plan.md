## Tujuan

Menambahkan dukungan **Multi Unit Usaha (Business Unit)** ke seluruh sistem akuntansi BUMDes — dari pondasi data, modul transaksi, hingga laporan — tanpa merusak data existing dan modul yang sudah berjalan.

---

## Strategi Aman (Prinsip Utama)

1. **Backward compatible**: kolom `business_unit_id` dibuat **nullable** dulu. Data lama otomatis di-assign ke unit "Unit Umum / Konsolidasi" via backfill, baru kemudian di-set `NOT NULL`.
2. **Filter di level database** lewat index `(business_unit_id, tanggal)` untuk performa.
3. **Tidak menyentuh logika double-entry** — hanya menambahkan dimensi unit.
4. **Modul lama tetap jalan**: kalau filter unit = "Semua", behavior identik dengan sekarang.

---

## FASE 1 — Pondasi Multi Unit (Aman, Tidak Mengubah UI Lama)

### 1.1 Skema Database Baru

**Tabel `business_units`** (master unit usaha):
- `id` uuid PK
- `kode` text unique (mis. `UMUM`, `SP`, `PAM`, `DAGANG`)
- `nama` text (mis. "Simpan Pinjam", "PAM Desa")
- `jenis` text — kategori: `simpan_pinjam` / `perdagangan` / `jasa` / `air_bersih` / `aset_modal` / `umum`
- `deskripsi` text nullable
- `is_active` boolean default true
- `is_default` boolean default false (penanda Unit Umum/Konsolidasi)
- `created_at`, `updated_at`

**Seed awal**: 1 baris `UMUM — Unit Umum / Konsolidasi` dengan `is_default = true`. Ini target backfill data lama.

**RLS**: read untuk authenticated, manage untuk admin.

### 1.2 Penambahan Kolom `business_unit_id`

Tambahkan kolom **nullable** ke tabel-tabel transaksi:
- `journals.business_unit_id` — sumber kebenaran untuk filter laporan
- `activity_entries.business_unit_id` — opsional (sudah terhubung lewat journal, tapi memudahkan query)
- `receivables.business_unit_id`
- `payables.business_unit_id`
- `assets.business_unit_id`
- `inventory_items.business_unit_id`
- `inventory_movements.business_unit_id`

**Catatan**: tidak menambahkan ke `accounts` (CoA tetap satu untuk seluruh BUMDes — best practice untuk konsolidasi).

### 1.3 Backfill Data Existing

Migrasi SQL:
1. Insert default unit `UMUM` jika belum ada.
2. `UPDATE` semua tabel di atas → set `business_unit_id` = id default unit untuk semua baris yang masih `NULL`.
3. Ubah kolom menjadi `NOT NULL DEFAULT <id-default>` agar insert baru tanpa unit tetap aman.

### 1.4 Index Performa

- `idx_journals_unit_tanggal` ON `journals(business_unit_id, tanggal)`
- `idx_journal_lines_journal` ON `journal_lines(journal_id)` (kalau belum ada)
- Index serupa pada `receivables`, `payables`, `assets`.

### 1.5 Halaman Manajemen Unit Usaha

Route baru `src/routes/_app.unit-usaha.tsx`:
- Tabel CRUD unit usaha (admin only).
- Field: kode, nama, jenis, deskripsi, status aktif.
- Validasi: tidak boleh menonaktifkan unit default.

### 1.6 Sidebar

Tambah menu **"Unit Usaha"** (icon `Store`) di `src/components/AppSidebar.tsx` di bawah "Bagan Akun".

### 1.7 Global Unit Selector (Context)

File baru `src/lib/business-unit-context.tsx`:
- React Context yang menyediakan `currentUnitId`, `setCurrentUnitId`, `units[]`.
- Disimpan di `localStorage` (`bumdes:active_unit`) agar persist antar reload.
- Dimuat sekali di `_app.tsx` (root layout) lewat `<BusinessUnitProvider>`.

**UI Selector** di header `_app.tsx`:
- `<Select>` dropdown dengan opsi `Semua Unit (Konsolidasi)` + daftar unit aktif.
- Selalu terlihat di topbar — menjadi filter global untuk semua halaman.

---

## FASE 2 — Refactor Modul Transaksi

### 2.1 Catat Kegiatan (`_app.catat-kegiatan.tsx`)

**Flow baru**: Pilih Unit → Pilih Template → Isi Form → Preview → Posting.

- Tambah step "Pilih Unit Usaha" di awal (default ikut global selector, bisa override per transaksi).
- Saat insert ke `journals` dan `activity_entries`, sertakan `business_unit_id`.
- **Filter template berdasarkan jenis unit**: kalau unit = `simpan_pinjam`, hanya tampilkan template `business_type = "Simpan Pinjam"` + template umum (Operasional, Aset & Modal). Field baru di `activity_templates.applicable_units` (text[] nullable; null = berlaku semua).

### 2.2 Input Jurnal Manual (`_app.jurnal.baru.tsx`)

- Tambah field **Unit Usaha** (Select) di form, default = global unit aktif.
- Insert `business_unit_id` ke `journals`.

### 2.3 Jurnal Koreksi (`_app.jurnal.koreksi.tsx`)

- Jurnal koreksi otomatis mewarisi `business_unit_id` dari jurnal yang dikoreksi.

### 2.4 Modul Piutang, Utang, Aset, Persediaan

Pada masing-masing form CRUD:
- Tambah field "Unit Usaha" (Select), default global selector.
- Insert/update sertakan `business_unit_id`.
- Tabel list menampilkan kolom Unit (badge).
- Auto-filter berdasarkan global selector (kalau "Semua", tampilkan semua).

### 2.5 Helper Query

File baru `src/lib/unit-filter.ts`:
- Util `applyUnitFilter(query, unitId)` — meng-chain `.eq("business_unit_id", id)` kalau bukan "Semua".
- Dipakai konsisten di semua halaman list/laporan.

---

## FASE 3 — Laporan Per Unit + Konsolidasi

### 3.1 Laporan Keuangan (`_app.laporan.tsx`)

- Tambah filter **Unit Usaha** di toolbar (default ikut global selector).
- Query Laba Rugi, Neraca, Arus Kas:
  - Jika unit dipilih → filter `journals.business_unit_id = ?`
  - Jika "Semua" → tidak ada filter (= konsolidasi seperti sekarang).
- **Tab "Per Unit"** baru: side-by-side comparison kolom per unit (mis. Laba Rugi: kolom Simpan Pinjam | PAM | Dagang | Total).

### 3.2 Buku Besar (`_app.buku-besar.tsx`)

- Tambah filter Unit Usaha di toolbar.
- Saldo akun bisa di-breakdown per unit (opsional collapse).

### 3.3 Generate LPJ (`_app.lpj.tsx`)

- Pilihan: LPJ per Unit atau LPJ Konsolidasi.
- PDF header menampilkan nama unit yang dipilih.

### 3.4 Dashboard (`_app.dashboard.tsx`)

- Stats card mengikuti global unit selector.
- Tambah widget "Ringkasan Per Unit" (bar chart kontribusi laba per unit).

---

## Detail Teknis

### Urutan Eksekusi Migrasi (penting agar tidak break)

1. **Migrasi 1**: `CREATE TABLE business_units` + RLS + seed default `UMUM`.
2. **Migrasi 2**: `ALTER TABLE` tambah `business_unit_id` (nullable) ke semua tabel transaksi + index.
3. **Migrasi 3 (Backfill)**: `UPDATE ... SET business_unit_id = <default>` lalu `ALTER ... SET NOT NULL DEFAULT <default>`.
4. **Migrasi 4**: Tambah `activity_templates.applicable_units text[]`.
5. Setelah semua migrasi sukses → deploy code Fase 1, 2, 3 secara bertahap.

### Filter Strategy

- **Database-level**: WHERE clause + index — tercepat, jadi sumber utama.
- **Service layer**: helper `applyUnitFilter()` untuk konsistensi.
- **UI state**: hanya menyimpan `currentUnitId` aktif (Context + localStorage).

### Risiko Performa & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Query laporan lebih lambat karena filter tambahan | Composite index `(business_unit_id, tanggal)` |
| Aggregasi konsolidasi (semua unit) baca banyak baris | Sudah ada paginated streaming di dashboard; pertahankan pola yang sama untuk laporan besar |
| Banyak rerender UI karena context global | `useMemo` units list + selector pakai `useState` lokal yang hanya commit ke context saat berubah |

### File yang Akan Dibuat

- `src/lib/business-unit-context.tsx`
- `src/lib/unit-filter.ts`
- `src/components/UnitSelector.tsx` (topbar + dropdown reusable)
- `src/routes/_app.unit-usaha.tsx`
- 4 file migrasi SQL (sesuai urutan di atas)

### File yang Akan Diedit

- `src/routes/_app.tsx` (header + provider)
- `src/components/AppSidebar.tsx` (menu baru)
- `src/components/MobileNav.tsx` (menu baru)
- `src/routes/_app.catat-kegiatan.tsx` (Fase 2)
- `src/routes/_app.jurnal.baru.tsx` (Fase 2)
- `src/routes/_app.jurnal.koreksi.tsx` (Fase 2)
- `src/routes/_app.piutang.tsx`, `_app.utang.tsx`, `_app.aset.tsx`, `_app.persediaan.tsx` (Fase 2)
- `src/routes/_app.laporan.tsx`, `_app.buku-besar.tsx`, `_app.lpj.tsx`, `_app.dashboard.tsx` (Fase 3)

### Verifikasi Pasca-Implementasi

1. Data lama tetap muncul di laporan (terlabel `Unit Umum`).
2. Total Laba Rugi konsolidasi = jumlah Laba Rugi semua unit.
3. Switch unit di topbar langsung memfilter dashboard, jurnal, laporan.
4. RLS tetap menjaga akses hanya admin/bendahara.

---

## Hasil Akhir

- BUMDes bisa mencatat & melihat laporan per unit usaha.
- Konsolidasi tetap bisa diakses (default behavior lama).
- Tidak ada migrasi destruktif — semua reversible kecuali penambahan kolom.
- Sidebar bertambah 1 menu "Unit Usaha", topbar bertambah 1 dropdown selector.

Setelah Anda **Approve**, saya akan eksekusi Fase 1 → 2 → 3 berurutan dalam sesi build.