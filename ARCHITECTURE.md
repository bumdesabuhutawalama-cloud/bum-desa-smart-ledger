# 📋 BUM Desa Smart Ledger - Arsitektur Multi-Unit ERP

## 🎯 Ringkasan Restrukturisasi

Sistem telah di-refactor dari **model global/shared** menjadi **ERP multi-unit terpisah** dengan halaman khusus untuk setiap unit usaha. Setiap unit memiliki login page, dashboard, dan aplikasi terpisah namun tetap terintegrasi dalam satu database.

---

## 📁 Struktur Folder Baru

```
src/
├── lib/
│   ├── unit-context.tsx          ✨ ENHANCED - Enhanced unit context dengan module registry
│   ├── unit-modules.ts           ✨ NEW - Unit modules config (PANGAN, DAGANG, JASA, SP)
│   └── ...
│
├── shared/
│   ├── layouts/
│   │   └── UnitLayout.tsx        ✨ NEW - Layout reusable untuk semua unit
│   ├── components/
│   │   └── DashboardCards.tsx    ✨ NEW - Card components dashboard
│   └── hooks/
│       └── useUnitFilter.ts      ✨ NEW - Hook untuk auto unit filtering
│
├── routes/
│   ├── index.tsx                 ✅ UPDATED - Redirect ke /auth
│   ├── auth.tsx                  ✅ UPDATED - Unit selection page
│   ├── dagang.tsx                ✨ NEW - Dagang layout (/dagang/*)
│   ├── dagang.login.tsx          ✨ NEW - Login page unit dagang
│   ├── dagang.dashboard.tsx      ✨ NEW - Dashboard unit dagang
│   ├── dagang.index.tsx          ✨ NEW - Redirect /dagang → /dagang/login
│   ├── pangan.tsx                ✨ NEW - Pangan layout (/pangan/*)
│   ├── pangan.login.tsx          ✨ NEW - Login page unit pangan
│   ├── pangan.dashboard.tsx      ✨ NEW - Dashboard unit pangan
│   ├── pangan.index.tsx          ✨ NEW - Redirect /pangan → /pangan/login
│   ├── jasa.tsx                  ✨ NEW - Jasa layout (/jasa/*)
│   ├── jasa.login.tsx            ✨ NEW - Login page unit jasa
│   ├── jasa.dashboard.tsx        ✨ NEW - Dashboard unit jasa
│   ├── jasa.index.tsx            ✨ NEW - Redirect /jasa → /jasa/login
│   ├── sp.tsx                    ✨ NEW - SP layout (/sp/*)
│   ├── sp.login.tsx              ✨ NEW - Login page unit SP
│   ├── sp.dashboard.tsx          ✨ NEW - Dashboard unit SP
│   ├── sp.index.tsx              ✨ NEW - Redirect /sp → /sp/login
│   └── ... (routes lainnya tetap ada)
│
├── components/
│   ├── AppSidebar.tsx            ✅ UPDATED - Sidebar dinamis dengan unit menus
│   ├── UnitSelector.tsx          ✅ UPDATED - Gunakan useUnit hook
│   └── MobileNav.tsx
│
└── supabase/
    └── migrations/
        └── 20260509_add_unit_ketahanan_pangan.sql ✨ NEW - Seed data PANGAN unit
```

---

## 🏢 Unit-Unit yang Tersedia

| Unit | Slug | Login URL | Dashboard URL | Icon | Warna |
|------|------|-----------|---------------|------|-------|
| **Unit Perdagangan** | `dagang` | `/dagang/login` | `/dagang/dashboard` | 🛒 ShoppingCart | Biru |
| **Unit Ketahanan Pangan** | `pangan` | `/pangan/login` | `/pangan/dashboard` | 🌾 Leaf | Hijau |
| **Unit Jasa** | `jasa` | `/jasa/login` | `/jasa/dashboard` | 💼 Briefcase | Ungu |
| **Unit Simpan Pinjam** | `sp` | `/sp/login` | `/sp/dashboard` | 🏦 PiggyBank | Orange |

---

## 🔄 Unit Context & State Management

### useUnit() Hook

Pengganti `useBusinessUnit()` dengan fitur tambahan:

```typescript
const {
  // Data
  units: BusinessUnit[];
  defaultUnit: BusinessUnit | null;

  // Current state
  currentUnitId: string;              // ID unit yang dipilih
  currentUnitKode: string | null;     // Kode unit (PANGAN, DAGANG, dll)

  // Actions
  setCurrentUnitId: (id: string) => void;
  setCurrentUnitKode: (kode: string) => void;

  // Helpers
  getUnitById: (id: string) => BusinessUnit | null;
  getUnitByKode: (kode: string) => BusinessUnit | null;
  getUnitModule: (kode: string) => UnitModule | null;
  resolveWriteUnitId: () => string | null;    // Resolve unit untuk insert data
  isConsolidating: boolean;                    // true jika currentUnitId === "ALL"

  // Utils
  loading: boolean;
  reload: () => Promise<void>;
} = useUnit()
```

### Backward Compatibility

`useBusinessUnit()` masih tersedia sebagai alias untuk `useUnit()` agar tidak breaking changes.

---

## 🛣️ Routing Structure Baru

### Landing Page
- `/` → Redirect ke `/auth`
- `/auth` → **Unit Selection Page** (halaman pemilihan unit)

### Unit-Specific Routes

#### Unit Dagang (`/dagang/*`)
```
/dagang              → Redirect ke /dagang/login
/dagang/login        → Login page unit dagang
/dagang/dashboard    → Dashboard unit dagang
/dagang/penjualan    → Penjualan (stub)
/dagang/pembelian    → Pembelian (stub)
/dagang/persediaan   → Persediaan (stub)
/dagang/kas-bank     → Kas & Bank (stub)
/dagang/jurnal       → Jurnal (stub)
/dagang/laporan      → Laporan (stub)
```

#### Unit Pangan (`/pangan/*`)
```
/pangan              → Redirect ke /pangan/login
/pangan/login        → Login page unit pangan
/pangan/dashboard    → Dashboard unit pangan
/pangan/penjualan    → Penjualan pangan (stub)
/pangan/pembelian    → Pembelian bahan (stub)
/pangan/persediaan   → Persediaan (stub)
/pangan/kas-bank     → Kas & Bank (stub)
/pangan/jurnal       → Jurnal (stub)
/pangan/laporan      → Laporan (stub)
```

#### Unit Jasa (`/jasa/*`)
```
/jasa                → Redirect ke /jasa/login
/jasa/login          → Login page unit jasa
/jasa/dashboard      → Dashboard unit jasa
/jasa/penjualan      → Penjualan jasa (stub)
/jasa/biaya          → Biaya operasional (stub)
/jasa/kontrak        → Manajemen kontrak (stub)
/jasa/kas-bank       → Kas & Bank (stub)
/jasa/jurnal         → Jurnal (stub)
/jasa/laporan        → Laporan (stub)
```

#### Unit SP (`/sp/*`)
```
/sp                  → Redirect ke /sp/login
/sp/login            → Login page unit SP
/sp/dashboard        → Dashboard unit SP
/sp/pinjaman         → Kelola pinjaman (stub)
/sp/simpanan         → Kelola simpanan (stub)
/sp/transaksi        → Transaksi harian (stub)
/sp/kas-bank         → Kas & Bank (stub)
/sp/jurnal           → Jurnal (stub)
/sp/laporan          → Laporan (stub)
```

---

## 💾 Database Changes

### Seeded Units

Pada migration `20260509_add_unit_ketahanan_pangan.sql`:

```sql
INSERT INTO public.business_units (kode, nama, jenis, deskripsi, is_active)
VALUES ('PANGAN', 'Unit Ketahanan Pangan', 'ketahanan_pangan', '...', true)
```

Existing units:
- **UMUM** (Unit Umum) - Default untuk konsolidasi
- **SP** (Unit Simpan Pinjam)
- **PAM** (Unit Air Bersih)
- **DAGANG** (Unit Perdagangan)
- **JASA** (Unit Jasa & Sewa)

### Field Wajib untuk Multi-Unit

Semua transaksi HARUS memiliki `business_unit_id`:

- `journals.business_unit_id`
- `activity_entries.business_unit_id`
- `receivables.business_unit_id`
- `payables.business_unit_id`
- `assets.business_unit_id`
- `inventory_items.business_unit_id`
- `inventory_movements.business_unit_id`

---

## 🎨 Shared Components & Hooks

### UnitLayout Component

Wrapper untuk setiap halaman unit. Otomatis validasi context:

```tsx
<UnitLayout
  title="Dashboard Unit Pangan"
  description="Pantau kinerja finansial unit pangan"
  unitKode="PANGAN"
>
  {children}
</UnitLayout>
```

### DashboardCards Components

Reusable card components:

- **StatCard** - Display KPI dengan icon
- **ModuleCard** - Display feature links dengan icon
- **EmptyState** - Display empty state UI

### useUnitFilter Hook

Otomatis filter data per unit dalam queries:

```tsx
const { unitIdFilter, isConsolidating } = useUnitFilter();

// Gunakan dalam query:
.match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
```

---

## 🔐 Login Flow per Unit

### User Journey

1. **Landing Page** (`/auth`)
   - User melihat 4 card unit
   - Klik card unit yang diinginkan

2. **Login Page** (`/{unit}/login`)
   - Form login dengan branding unit
   - Background gradient sesuai unit
   - Auto redirect ke dashboard setelah login

3. **Dashboard Unit** (`/{unit}/dashboard`)
   - KPI cards khusus unit
   - Module cards sesuai kebutuhan unit
   - Sidebar dengan menu unit

4. **Feature Pages** (`/{unit}/{feature}`)
   - Semua data otomatis terfilter per unit
   - UI konsisten dengan branding unit

### Auto Unit Context Setting

Setiap login page otomatis set unit context:

```typescript
// Dalam login handler
await signIn(email, password);
setCurrentUnitKode("DAGANG");  // Auto set unit
nav({ to: "/dagang/dashboard" });
```

---

## 🎯 Dashboard Setiap Unit

Setiap unit memiliki dashboard yang disesuaikan dengan bisnisnya:

### Unit Dagang Dashboard:
- Penjualan Hari Ini
- Kas Toko
- Stok Barang
- Pelanggan Aktif
- Modules: Penjualan, Pembelian, Persediaan, Kas & Bank, Jurnal, Laporan

### Unit Pangan Dashboard:
- Penjualan Pangan
- Kas Unit
- Stok Pangan
- Petani Mitra
- Modules: Penjualan Pangan, Pembelian Bahan, Persediaan, Kas & Bank, Jurnal, Laporan

### Unit Jasa Dashboard:
- Pendapatan Jasa
- Kas Unit
- Kontrak Aktif
- Klien Aktif
- Modules: Penjualan Jasa, Biaya Operasional, Kontrak, Kas & Bank, Jurnal, Laporan

### Unit SP Dashboard:
- Dana Simpanan
- Dana Pinjaman
- Pendapatan Bunga
- Anggota Aktif
- Modules: Pinjaman, Simpanan, Transaksi, Kas & Bank, Jurnal, Laporan

---

## 🔀 Konsolidasi Multi-Unit

### Mode Konsolidasi (currentUnitId === "ALL")

Ketika user memilih **"Semua Unit (Konsolidasi)"** di unit selector:

```typescript
const { isConsolidating } = useUnit();

if (isConsolidating) {
  // Tampilkan data dari SEMUA unit
  query.select('*')  // Tanpa filter business_unit_id
} else {
  // Tampilkan data dari unit aktif saja
  query.match({ business_unit_id: currentUnitId })
}
```

---

## 📊 User Experience Flow

### First Time User:
1. Buka `/` → redirect ke `/auth`
2. Lihat halaman pemilihan unit
3. Klik "Unit Perdagangan" → ke `/dagang/login`
4. Login dengan email/password
5. Auto redirect ke `/dagang/dashboard`
6. Dashboard khusus unit dagang terbuka

### Switching Units:
1. User di `/dagang/dashboard`
2. Klik unit selector → pilih "Unit Pangan"
3. Redirect ke `/pangan/login`
4. Login lagi → ke `/pangan/dashboard`

### Within Unit Navigation:
1. User di `/dagang/dashboard`
2. Klik "Penjualan" → ke `/dagang/penjualan`
3. Semua data otomatis terfilter untuk unit DAGANG
4. Sidebar tetap menampilkan menu unit dagang

---

## 🚀 Cara Menggunakan

### **Untuk User:**
1. Buka aplikasi → Halaman pemilihan unit muncul
2. Klik unit yang diinginkan
3. Login dengan akun unit tersebut
4. Dashboard khusus unit terbuka
5. Semua fitur terfilter otomatis per unit

### **Untuk Developer:**
1. **Buat login page** berdasarkan template yang ada
2. **Buat dashboard** dengan KPI dan modules sesuai unit
3. **Gunakan `useUnitFilter()`** untuk auto data filtering
4. **Gunakan `UnitLayout`** untuk consistent UI
5. Lihat `DEVELOPMENT.md` untuk detailed guide

---

## 📋 Checklist Implementasi

- [x] Create unit selection landing page (`/auth`)
- [x] Create 4 unit login pages with branding
- [x] Create 4 unit dashboard pages with KPIs
- [x] Create unit layouts and routing structure
- [x] Create redirect pages for unit roots
- [x] Update sidebar for unit-specific navigation
- [x] Implement auto unit context setting
- [x] Create shared components and hooks
- [x] Update database with PANGAN unit
- [ ] Create feature pages (penjualan, pembelian, jurnal, laporan)
- [ ] Integrate with existing data queries
- [ ] Add unit-specific business logic
- [ ] Create API endpoints with unit awareness
- [ ] Add RLS policies per unit
- [ ] User permission system per unit
- [ ] Testing multi-unit scenarios

---

## 📚 Referensi

- 📘 Full Architecture: [ARCHITECTURE.md](../ARCHITECTURE.md)
- 📗 Dev Guide: [DEVELOPMENT.md](../DEVELOPMENT.md)
- 💾 Unit Context: [src/lib/unit-context.tsx](../src/lib/unit-context.tsx)
- ⚙️ Modules Config: [src/lib/unit-modules.ts](../src/lib/unit-modules.ts)
- 🎨 Dashboard Example: [src/routes/dagang.dashboard.tsx](../src/routes/dagang.dashboard.tsx)
- 📘 Shared Layout: [src/shared/layouts/UnitLayout.tsx](../src/shared/layouts/UnitLayout.tsx)
- 📘 Filter Hook: [src/shared/hooks/useUnitFilter.ts](../src/shared/hooks/useUnitFilter.ts)

---

Generated on: 2026-05-09
```

---

## 🔐 Sidebar Navigation Dinamis

### AppSidebar Features

✅ **Global Menu**
- Dashboard Utama
- Data Master
- Daftar Unit Usaha
- Unit Pusat (special unit)

✅ **Unit Operasional Section**
- Expandable menu per unit
- Top 3 submenu visible
- "Lihat semua" untuk menu lengkap
- Active unit highlighted

✅ **Auto Unit-Context Switching**
- Klik unit header → ubah currentUnitKode
- URL tetap sesuai dengan unit context

---

## 🚀 Cara Menggunakan

### 1. Akses Dashboard Unit

```typescript
// User navigasi ke /unit/pangan/dashboard
// Otomatis:
// 1. Component mount, useEffect set currentUnitKode = "PANGAN"
// 2. AppSidebar reflect pilihan unit
// 3. Semua data terfilter untuk PANGAN
```

### 2. Gunakan Unit Filter Otomatis

```typescript
function MyTransactionList() {
  const { whereUnit } = useUnitQueryFilter();
  
  const query = supabase
    .from('journals')
    .select('*')
    .match(whereUnit())  // Auto filter berdasarkan currentUnitId
    .order('created_at', { ascending: false });
}
```

### 3. Display Unit-Specific Data

```typescript
function StatCard() {
  const { currentUnitKode, isConsolidating } = useUnit();
  
  return (
    <div>
      Showing data for: {isConsolidating ? 'All Units' : currentUnitKode}
    </div>
  );
}
```

---

## 📊 Dashboard Setiap Unit

Setiap unit memiliki dashboard yang sama struktur tapi data berbeda:

### Template Dashboard:

1. **KPI Cards** (4 card)
   - Total Revenue / Penjualan
   - Kas & Bank
   - Laba Kotor / Pendapatan
   - Jumlah Transaksi

2. **Module Quick Access** (6 card grid)
   - Input Transaksi
   - Kelola Master Data (Inventory/Invoice/dll)
   - Laporan Keuangan
   - Manage Jurnal
   - Kas & Bank
   - Transfer Antar Unit

---

## 🔧 Customization Setiap Unit

### Untuk menambah feature ke satu unit:

1. **Buat route baru:**
   ```
   src/routes/_app.unit.pangan.fitur-baru.tsx
   ```

2. **Update UNIT_MODULES:**
   ```typescript
   // src/lib/unit-modules.ts
   UNIT_MODULES['PANGAN'].subMenus.push({
     label: "Fitur Baru",
     href: "/unit/pangan/fitur-baru"
   })
   ```

3. **Gunakan useUnitFilter dalam komponen:**
   ```typescript
   const { whereUnit } = useUnitQueryFilter();
   ```

---

## 🔀 Konsolidasi Multi-Unit

### Mode Konsolidasi (currentUnitId === "ALL")

Ketika user memilih **"Semua Unit (Konsolidasi)"**:

```typescript
const { isConsolidating } = useUnit();

if (isConsolidating) {
  // Tampilkan data dari SEMUA unit
  query.select('*')  // Tanpa filter business_unit_id
} else {
  // Tampilkan data dari unit aktif saja
  query.match({ business_unit_id: currentUnitId })
}
```

---

## 📈 Scalability

Sistem ini **fully scalable** untuk:

✅ Menambah unit baru dengan mudah:
1. Insert ke `business_units` table
2. Tambah entry ke `UNIT_MODULES` di `unit-modules.ts`
3. Create route folder `_app.unit.{slug}.tsx`
4. Sidebar otomatis render unit baru

✅ Menambah feature baru ke semua unit:
1. Update `UNIT_MODULES[unit].subMenus`
2. Create route files untuk setiap unit
3. Use `useUnitFilter` untuk auto filtering

---

## ✅ Checklist Implementasi

- [x] Create enhanced unit context (`unit-context.tsx`)
- [x] Create unit modules registry (`unit-modules.ts`)
- [x] Create database migration untuk PANGAN unit
- [x] Create folder structure untuk modules
- [x] Create shared layouts & components
- [x] Create dashboard pages untuk 4 unit
- [x] Update AppSidebar dengan menu dinamis
- [x] Update UnitProvider di _app.tsx
- [x] Create route index files
- [ ] Create feature pages (transaksi, jurnal, laporan, dll)
- [ ] Integrate dengan existing data queries
- [ ] Testing multi-unit filtering
- [ ] Testing route navigation
- [ ] User documentation

---

## 🧪 Testing

### Quick Test Checklist

- [ ] User dapat berpindah unit via dropdown header
- [ ] Sidebar menampilkan submenu yang sesuai unit
- [ ] Dashboard load dengan data unit yang tepat
- [ ] Data tidak tercampur antar unit
- [ ] Konsolidasi (ALL) menampilkan sum semua unit
- [ ] URL berubah sesuai navigasi unit
- [ ] LocalStorage menyimpan unit selection

---

## 📚 Referensi

- **Unit Context**: `src/lib/unit-context.tsx`
- **Modules Config**: `src/lib/unit-modules.ts`
- **Sidebar**: `src/components/AppSidebar.tsx`
- **Example Dashboard**: `src/routes/_app.unit.pangan.dashboard.tsx`
- **Shared Layout**: `src/shared/layouts/UnitLayout.tsx`
- **Filter Hook**: `src/shared/hooks/useUnitFilter.ts`

---

## 🔮 Next Steps

1. **Implement feature pages** untuk setiap unit (transaksi, journal, reports)
2. **Migrate existing queries** ke menggunakan `useUnitFilter()`
3. **Add unit-specific business logic** ke setiap module
4. **Create API endpoints** yang memahami unit context
5. **Update permission system** untuk row-level security per unit
6. **Testing** comprehensive untuk multi-unit scenarios

---

Generated on: 2026-05-09
