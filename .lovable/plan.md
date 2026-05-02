## Rencana: AI Bisa Tambah COA + Database Jenis Usaha

### Konteks Alur (hasil pengecekan)

Alur akun saat ini terhubung di banyak titik:

1. **Tabel `accounts`** (Bagan Akun / COA) — sumber kebenaran. Kolom: `kode_akun`, `nama_akun`, `tipe_akun` (enum: ASET, KEWAJIBAN, EKUITAS, PENDAPATAN, BEBAN, HPP, PENDAPATAN_LAIN, BEBAN_LAIN), `normal_balance` (DEBIT/KREDIT), `is_header`, `level`, `parent_id`, `is_active`. Format kode hierarkis 4 segmen: `1.1.01.01`.
2. **Catat Kegiatan** (`_app.catat-kegiatan.tsx`) — load akun aktif → kirim ke `buildJournal()` → resolve via `account-resolver.ts` (lookup symbol KAS, BANK, PIUTANG_USAHA, dll berdasarkan **prefix kode akun**) → bentuk baris jurnal double-entry → insert ke `journals` + `journal_lines` + `activity_entries`.
3. **AI Asisten** (`_app.ai-asisten.tsx` + `functions/ai-asisten/index.ts`) — menerima kode akun, mencari `accounts.find(a => a.kode_akun === kode)` untuk `draft_jurnal_manual`. Untuk `draft_kegiatan` pakai engine sama dengan Catat Kegiatan.
4. **Jurnal Manual** (`_app.jurnal.baru.tsx`) — pilih akun via dropdown.

**Implikasi**: akun baru otomatis muncul di seluruh modul **asalkan** kode_akun mengikuti pola prefix yang sudah dipakai resolver (mis. kas baru harus berawalan `1.1.01.` agar lookup KAS bekerja). Kalau tidak, akun tetap bisa dipakai manual tapi tidak di-pick template otomatis.

### 1. Database — Tabel `business_unit_types` (Jenis Usaha)

Saat ini `jenis` di `business_units` hanya kolom text bebas + dropdown hardcoded di UI. Akan dibuat tabel:

```sql
CREATE TABLE business_unit_types (
  id uuid PK,
  kode text UNIQUE NOT NULL,        -- 'simpan_pinjam', 'air_bersih', dll
  nama text NOT NULL,                -- 'Simpan Pinjam'
  deskripsi text,
  icon text DEFAULT 'Briefcase',
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,   -- jenis bawaan tidak bisa dihapus
  sort_order int DEFAULT 0,
  created_at, updated_at
);
```

Seed dengan 6 jenis existing: `umum`, `simpan_pinjam`, `perdagangan`, `jasa`, `air_bersih`, `aset_modal`. RLS: read all authenticated, manage admin only. Kolom `business_units.jenis` tetap text (FK soft via kode) supaya backward-compatible — tidak migrasi data.

UI: halaman `/jenis-usaha` (admin) untuk CRUD; halaman `/unit-usaha` ganti dropdown jenis dari hardcoded → load dari tabel.

### 2. Halaman COA Manual (Tambah/Edit Akun)

Upgrade `_app.akun.tsx` (sekarang read-only) jadi bisa CRUD untuk admin/bendahara:
- Tombol **Tambah Akun** → dialog dengan field: kode_akun, nama_akun, tipe_akun (select enum), normal_balance (auto dari tipe, override-able), parent_id (pilih dari akun header), level (auto dari jumlah segmen kode), is_header, is_active, deskripsi.
- Validasi: kode unik, format `\d+(\.\d+){0,3}`, parent_id konsisten (kode anak harus diawali kode parent + ".").
- Tombol Edit per baris (non-system).

### 3. Tool AI: `tambah_akun` (Draft → Konfirmasi)

Tambah tool ke edge function `ai-asisten`:

```ts
{
  name: "draft_tambah_akun",
  parameters: {
    kode_akun: string,           // mis "1.1.01.06"
    nama_akun: string,           // mis "Kas di Bank Jago"
    tipe_akun: enum,             // ASET | KEWAJIBAN | ...
    normal_balance?: enum,       // opsional, AI bisa infer dari tipe
    parent_kode?: string,        // mis "1.1.01.00"
    is_header?: boolean,
    deskripsi?: string,
    ringkasan: string
  }
}
```

System prompt diperluas:
- AI diberi daftar tipe_akun + aturan saldo normal (ASET/BEBAN/HPP=DEBIT; KEWAJIBAN/EKUITAS/PENDAPATAN=KREDIT).
- AI diberi konvensi kode 4-segmen hierarkis dan contoh prefix penting (1.1.01=Kas, 1.1.03=Piutang, 4=Pendapatan, 5=Beban).
- Aturan: "Bila user minta tambah akun, gunakan `draft_tambah_akun`. Bila user mau pakai akun untuk transaksi tapi belum ada, sarankan tambah dulu via `answer` dengan `perlu_klarifikasi=true` ATAU langsung buat draft dua langkah (tambah akun → minta user posting → minta lagi untuk transaksinya)."
- AI **wajib** sarankan kode berikutnya yang belum dipakai dalam grup parent.

UI Chat: `DraftPreview` dapat varian baru `draft_tambah_akun` → tampilkan kartu preview akun (kode, nama, tipe, saldo normal, parent), tombol **Tambah Akun**. Setelah berhasil, refresh `accounts` cache supaya akun baru langsung tersedia untuk perintah selanjutnya di session yang sama.

### 4. Validasi Konsistensi (Penting)

Sebelum insert (baik dari halaman manual maupun dari AI):
- Cek kode unik (case-sensitive di DB).
- Validasi format kode regex `^\d+(\.\d+){1,3}$`.
- Hitung `level` dari jumlah segmen.
- Bila `parent_kode` diisi: cari `parent_id`, pastikan `is_header=true`, dan kode anak harus berawalan `parent.kode_akun.replace(/\.00+$/, "") + "."`.
- `normal_balance` default mengikuti tipe (ASET/BEBAN/HPP→DEBIT; KEWAJIBAN/EKUITAS/PENDAPATAN/PENDAPATAN_LAIN→KREDIT; BEBAN_LAIN→DEBIT). Bisa override (untuk akun kontra seperti penyisihan piutang yang tipe=ASET tapi normal=KREDIT).
- `is_header=true` → akun tidak bisa dipakai di journal_lines (sudah dijaga di resolver via filter `!a.is_header`).

### 5. Dampak ke Modul Lain

- **Catat Kegiatan**: tidak berubah — load `accounts.is_active=true` tetap menarik akun baru. Bila akun baru kode-nya cocok dengan prefix lookup (mis. `1.1.01.06`), template kas otomatis bisa pakai.
- **Jurnal Manual**: dropdown akun otomatis menampilkan akun baru.
- **AI Asisten draft_jurnal_manual**: setelah akun di-insert, refresh state `accounts` di halaman → AI di pesan berikutnya sudah lihat akun baru di context.
- **Laporan/Buku Besar**: query agregasi via `journal_lines.account_id` → otomatis ikut.
- **Resolver lookup**: tidak ada perubahan kode. Bila user tambah jenis akun baru di luar prefix yang dikenal (mis. dompet digital di `1.1.08.xx`), template lama tidak otomatis pick — itu desain (resolver berbasis aturan tetap, bukan auto-discovery). Tidak ada risiko regresi.

### 6. Migrasi Database

Satu migration:
```sql
-- Tabel jenis usaha + seed + RLS
CREATE TABLE business_unit_types (...);
INSERT INTO business_unit_types(kode,nama,is_system,sort_order) VALUES (...) x6;
ALTER TABLE business_unit_types ENABLE RLS;
CREATE POLICY ... USING (true) FOR SELECT;
CREATE POLICY ... USING (has_role(auth.uid(),'admin')) FOR ALL;
```

Tidak ada perubahan tabel `accounts` (struktur sudah memadai).

### 7. File yang Diubah / Dibuat

Baru:
- `supabase/migrations/<ts>_business_unit_types.sql`
- `src/routes/_app.jenis-usaha.tsx` — CRUD jenis usaha (admin)
- `src/lib/account-utils.ts` — helper validasi & inferensi (level, normal_balance default, kode berikutnya)

Diubah:
- `src/routes/_app.akun.tsx` — tambah Tambah/Edit dialog
- `src/routes/_app.unit-usaha.tsx` — load `JENIS_OPTIONS` dari DB
- `src/components/AppSidebar.tsx` — menu "Jenis Usaha" (admin)
- `supabase/functions/ai-asisten/index.ts` — tambah tool `draft_tambah_akun` + perluas system prompt (sertakan enum tipe_akun, aturan kode, daftar parent header)
- `src/routes/_app.ai-asisten.tsx` — tipe `AnyDraft` tambah varian akun, render kartu preview akun + handler insert + reload accounts setelah sukses

### 8. Yang TIDAK Saya Ubah (Justifikasi Aman)

- Engine `activity-engine.ts` & `account-resolver.ts` — sudah tahan akun baru karena dasar prefix.
- Schema `accounts` & `business_units` — backward-compatible.
- Semua route laporan & buku besar — query tidak terpengaruh.

### Ringkasan Manfaat

- AI bisa tambah akun via percakapan (mis. *"tambahkan akun Kas di Bank Jago"*) → preview → user posting.
- Admin bisa tambah akun manual via halaman Bagan Akun (sebelumnya read-only).
- Jenis usaha jadi data terkelola, bisa ditambah tanpa edit kode.
- Tidak ada perubahan breaking pada modul Catat Kegiatan, Jurnal, atau Laporan.
