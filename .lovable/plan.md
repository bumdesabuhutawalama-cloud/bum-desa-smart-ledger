
# Plan: Modul "Catat Kegiatan" — Business-Driven Journal Input

## Prinsip Inti

**Layer baru, bukan pengganti.** Modul ini menerjemahkan "kegiatan usaha" menjadi jurnal double-entry, lalu menulis ke tabel `journals` + `journal_lines` yang sama persis seperti Mode Manual / Otomatis. Tidak ada perubahan pada engine akuntansi, laporan, LPJ, koreksi, atau modul lain.

```text
[Catat Kegiatan UI]  →  [Template Engine]  →  [Journal Builder]  →  journals + journal_lines
                              ↑                                              ↑
                       activity_templates                            (sumber tunggal kebenaran)
```

## Arsitektur

### Database (1 migration baru, additive)

Tabel **`activity_templates`** — definisi template kegiatan, dapat diedit admin.
- `id`, `business_type`, `code`, `name`, `description`, `icon`, `is_active`, `sort_order`
- `fields` (jsonb) — definisi input dinamis untuk user
- `lines` (jsonb) — aturan generate baris jurnal (account lookup + formula debit/kredit)
- `keterangan_template` (text) — template narasi keterangan jurnal

Tabel **`activity_entries`** — riwayat input kegiatan (audit trail layer kegiatan).
- `id`, `template_id`, `journal_id` (FK ke `journals`), `input_data` (jsonb), `created_by`, `created_at`

Kolom baru pada `journals`: **tidak diubah**. Sumber input ditandai lewat kolom `source` yang sudah ada (`source = 'activity'`, `source_ref` = id `activity_entries`).

RLS: sama dengan tabel akuntansi lain (admin + bendahara manage, authenticated read).

### Mapping Akun Hybrid

Resolver akun bekerja 2 tahap:
1. **Auto** — cari akun aktif dengan prefix `kode_akun` (mis. Kas = `1.1.01.*`, Piutang Usaha = `1.1.03.*`, Pendapatan Bunga = `4.*` dengan keyword "bunga").
2. **Override** — jika template field `account_override: true` atau auto menemukan >1 kandidat, tampilkan dropdown ringkas (sudah difilter per kategori).

Helper: `src/lib/account-resolver.ts` — fungsi `resolveAccount(prefix | type | keyword, accounts)` mengembalikan kandidat + default.

### Template Engine

`src/lib/activity-engine.ts`:
- `renderFields(template)` → daftar input yang harus dirender
- `validateInput(template, values)` → validasi (required, ≥0, dll)
- `buildJournal(template, values, accounts)` → `{ keterangan, lines: [{account_id, debit, kredit, keterangan}] }`
- `assertBalanced(lines)` → guard total debit = total kredit sebelum submit

Aturan baris jurnal di `lines` jsonb mendukung:
- `account: { lookup: "KAS" | "PIUTANG_USAHA" | ... }` atau `account: { from_field: "akun_kas" }`
- `amount: { from_field: "pokok" }` atau `{ formula: "pokok + bunga" }` (parser sederhana, whitelist field)
- `side: "debit" | "kredit"`
- `condition: { field: "bunga", op: ">", value: 0 }` (opsional, untuk baris kondisional spt pendapatan bunga)

### UI

**Sidebar baru:** "Catat Kegiatan" (ikon `Sparkles` atau `ClipboardList`), ditempatkan setelah "Input Jurnal".

**Halaman `/catat-kegiatan` (`src/routes/_app.catat-kegiatan.tsx`):**
- Header + filter `business_type` (chip)
- Grid kartu ikon besar — 1 kartu per template aktif
- Klik kartu → buka dialog/sheet form dinamis
- Dalam dialog:
  - Form fields dirender otomatis
  - **Preview jurnal live** (tabel debit/kredit + total balance) — transparansi auditable
  - Tombol "Simpan & Posting" (langsung `status = posted`, sama seperti mode otomatis)
- Toast sukses + opsi "Lihat Jurnal" (link ke `/jurnal`)

**Halaman admin `/catat-kegiatan/templates` (opsional fase ini):**
- List template + toggle aktif/nonaktif
- Form edit template (CRUD `activity_templates`)
- Hanya role `admin`

## Paket 18 Template Awal

**Simpan Pinjam (4):**
1. Pencairan Pinjaman ke Anggota
2. Terima Angsuran (pokok + bunga)
3. Pelunasan Pinjaman
4. Hapus Buku Piutang Macet

**Perdagangan (3):**
5. Penjualan Tunai
6. Pembelian Barang Dagangan
7. Retur Penjualan

**Jasa & Sewa (2):**
8. Pendapatan Jasa Tunai
9. Terima Sewa Diterima Dimuka

**Air Bersih / PAM (2):**
10. Tagih Pelanggan PAM (akrual)
11. Terima Pembayaran Tagihan PAM

**Operasional (4):**
12. Bayar Gaji & Honor
13. Bayar Listrik / Air / Internet
14. Belanja ATK / Operasional
15. Bayar Transport & Perjalanan Dinas

**Aset & Modal (3):**
16. Belanja Aset Tetap
17. Setoran Modal dari Pemerintah Desa
18. Penarikan Pribadi / Pembagian SHU

## Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Template salah generate jurnal tidak balance | `assertBalanced` wajib lulus sebelum insert; preview live |
| Akun belum ada / prefix tidak match | Resolver fallback ke override dropdown; pesan error jelas |
| Template diubah retroaktif memengaruhi audit | `activity_entries.input_data` menyimpan snapshot input; jurnal tersimpan apa adanya |
| User awam salah pilih kegiatan | Setiap template punya `description` + contoh kasus; preview jurnal sebelum simpan |
| Konflik dengan modul Piutang/Aset existing | Template "Pencairan Pinjaman" dan "Belanja Aset" hanya membuat jurnal; record di tabel `receivables`/`assets` tetap dibuat manual via modul masing-masing (fase ini) — dicatat di description template |

## Yang TIDAK Diubah

- Tabel `journals`, `journal_lines`, `accounts`, `receivables`, `payables`, `assets`, `inventory_*`
- Halaman: Input Jurnal (Manual & Otomatis), Jurnal Umum, Buku Besar, Laporan, LPJ, Koreksi, Piutang, Aset, Persediaan, Utang
- Logika perhitungan laporan & LPJ
- File `client.ts`, `types.ts` (auto-generated setelah migration)

## Deliverables

**Migration:**
- `activity_templates` + `activity_entries` + RLS + seed 18 template

**File baru:**
- `src/routes/_app.catat-kegiatan.tsx` — halaman utama
- `src/routes/_app.catat-kegiatan.templates.tsx` — admin (opsional, bisa fase 2)
- `src/lib/activity-engine.ts` — builder, validator, formula parser
- `src/lib/account-resolver.ts` — hybrid lookup
- `src/components/ActivityCard.tsx`, `ActivityDialog.tsx`, `JournalPreview.tsx`

**File diedit:**
- `src/components/AppSidebar.tsx` — tambah menu

## Urutan Implementasi

1. Migration: tabel + RLS + seed 18 template
2. Helper: `account-resolver.ts` + `activity-engine.ts` (+ unit-style sanity di komponen)
3. Komponen UI: Card, Dialog, Preview
4. Route `/catat-kegiatan` + sidebar
5. Smoke test: jalankan 4 template berbeda, cek jurnal masuk dan laporan tetap akurat
6. (Opsional) Halaman admin template

## Setelah Disetujui

Implementasi langsung di mode build. Tidak ada perubahan breaking; semua modul lain tetap berfungsi 100% seperti sekarang.
