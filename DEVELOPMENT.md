# 🚀 BUM Desa Smart Ledger - Development Guide

## 🎯 Overview

Panduan lengkap untuk mengembangkan sistem ERP multi-unit terpisah dengan halaman khusus per unit usaha.

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── unit-context.tsx          # Enhanced unit context dengan module registry
│   ├── unit-modules.ts           # Unit modules config (PANGAN, DAGANG, JASA, SP)
│   └── ...
│
├── shared/
│   ├── layouts/
│   │   └── UnitLayout.tsx        # Layout reusable untuk semua unit
│   ├── components/
│   │   └── DashboardCards.tsx    # Card components dashboard
│   └── hooks/
│       └── useUnitFilter.ts      # Hook untuk auto unit filtering
│
├── routes/
│   ├── auth.tsx                  # Unit selection page
│   ├── {unit}.tsx                # Unit layout (/dagang/*, /pangan/*, dll)
│   ├── {unit}.login.tsx          # Login page unit
│   ├── {unit}.dashboard.tsx      # Dashboard unit
│   ├── {unit}.index.tsx          # Redirect /unit → /unit/login
│   └── ... (feature pages)
│
└── components/
    ├── AppSidebar.tsx            # Sidebar dinamis dengan unit menus
    └── UnitSelector.tsx          # Unit selector component
```

---

## 🏗️ Creating New Unit

### Step 1: Add Unit to Database

Tambahkan unit baru ke `business_units` table:

```sql
INSERT INTO public.business_units (kode, nama, jenis, deskripsi, is_active)
VALUES ('NEW_UNIT', 'Unit Baru', 'jenis_unit', 'Deskripsi unit baru', true)
```

### Step 2: Add Unit Module Config

Update `src/lib/unit-modules.ts`:

```typescript
export const UNIT_MODULES: Record<string, UnitModule> = {
  // ... existing units
  'NEW_UNIT': {
    kode: 'NEW_UNIT',
    nama: 'Unit Baru',
    slug: 'new-unit',
    icon: 'IconName',
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-600',
    description: 'Deskripsi unit baru',
    modules: [
      { name: 'Dashboard', path: '/new-unit/dashboard', icon: 'LayoutDashboard' },
      { name: 'Penjualan', path: '/new-unit/penjualan', icon: 'ShoppingCart' },
      // ... other modules
    ]
  }
}
```

### Step 3: Create Unit Routes

Buat 4 file route baru:

#### `src/routes/new-unit.tsx` (Layout)
```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { UnitProvider } from '@/lib/unit-context'
import { AppSidebar } from '@/components/AppSidebar'
import { UnitSelector } from '@/components/UnitSelector'

export const Route = createFileRoute('/new-unit')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/new-unit/login',
        search: {},
      })
    }
  },
  component: NewUnitLayout,
})

function NewUnitLayout() {
  return (
    <UnitProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <UnitSelector />
            <Outlet />
          </div>
        </main>
      </div>
    </UnitProvider>
  )
}
```

#### `src/routes/new-unit.login.tsx` (Login Page)
```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth-context'
import { useUnit } from '@/lib/unit-context'

export const Route = createFileRoute('/new-unit/login')({
  component: NewUnitLogin,
})

function NewUnitLogin() {
  const { signIn } = useAuth()
  const { setCurrentUnitKode } = useUnit()
  const navigate = useNavigate()

  const handleLogin = async (email: string, password: string) => {
    await signIn(email, password)
    setCurrentUnitKode('NEW_UNIT')
    navigate({ to: '/new-unit/dashboard' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
      {/* Login form dengan branding unit */}
    </div>
  )
}
```

#### `src/routes/new-unit.dashboard.tsx` (Dashboard)
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { StatCard, ModuleCard } from '@/shared/components/DashboardCards'

export const Route = createFileRoute('/new-unit/dashboard')({
  component: NewUnitDashboard,
})

function NewUnitDashboard() {
  return (
    <UnitLayout title="Dashboard Unit Baru" unitKode="NEW_UNIT">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Penjualan Hari Ini"
          value="Rp 2.500.000"
          icon="TrendingUp"
          trend="+12%"
        />
        {/* ... other KPI cards */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ModuleCard
          title="Penjualan"
          description="Kelola penjualan unit"
          icon="ShoppingCart"
          href="/new-unit/penjualan"
        />
        {/* ... other module cards */}
      </div>
    </UnitLayout>
  )
}
```

#### `src/routes/new-unit.index.tsx` (Redirect)
```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/new-unit/')({
  beforeLoad: () => {
    throw redirect({
      to: '/new-unit/login',
      replace: true,
    })
  },
})
```

### Step 4: Update Unit Selection Page

Tambahkan card unit baru di `src/routes/auth.tsx`:

```tsx
// Tambahkan card baru di grid
<Card className="cursor-pointer hover:shadow-lg transition-shadow">
  <CardHeader className="text-center">
    <IconName className="w-12 h-12 mx-auto mb-4 text-blue-500" />
    <CardTitle>Unit Baru</CardTitle>
    <CardDescription>Deskripsi unit baru</CardDescription>
  </CardHeader>
  <CardContent>
    <Button
      className="w-full"
      onClick={() => navigate({ to: '/new-unit/login' })}
    >
      Masuk Unit Baru
    </Button>
  </CardContent>
</Card>
```

---

## 🎨 Creating Feature Pages

### Template Feature Page

Gunakan `UnitLayout` dan `useUnitFilter` untuk setiap halaman fitur:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'

export const Route = createFileRoute('/dagang/penjualan')({
  component: PenjualanPage,
})

function PenjualanPage() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()

  // Query data dengan auto filter
  const { data: penjualan } = useQuery({
    queryKey: ['penjualan', unitIdFilter],
    queryFn: () => supabase
      .from('sales')
      .select('*')
      .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
  })

  return (
    <UnitLayout title="Penjualan" unitKode="DAGANG">
      <div className="space-y-6">
        {/* Page content */}
      </div>
    </UnitLayout>
  )
}
```

### Auto Unit Filtering Pattern

Selalu gunakan `useUnitFilter()` untuk query data:

```typescript
// ✅ CORRECT - Auto filter per unit
const { unitIdFilter, isConsolidating } = useUnitFilter()

const query = supabase
  .from('journals')
  .select('*')
  .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })

// ❌ WRONG - Manual filter (tidak konsisten)
const { currentUnitId } = useUnit()
const query = supabase
  .from('journals')
  .select('*')
  .eq('business_unit_id', currentUnitId)
```

---

## 🔧 Shared Components

### UnitLayout Props

```tsx
interface UnitLayoutProps {
  title: string                    // Page title
  description?: string            // Page description
  unitKode: string                // Unit kode (PANGAN, DAGANG, dll)
  children: React.ReactNode       // Page content
  showBackButton?: boolean        // Show back button
  backTo?: string                 // Back button destination
}
```

### DashboardCards Components

#### StatCard
```tsx
<StatCard
  title="Total Penjualan"
  value="Rp 1.250.000"
  icon="TrendingUp"
  trend="+8.2%"
  trendUp={true}
/>
```

#### ModuleCard
```tsx
<ModuleCard
  title="Persediaan"
  description="Kelola stok barang"
  icon="Package"
  href="/dagang/persediaan"
/>
```

### useUnitFilter Hook

```typescript
const {
  unitIdFilter: string | null,     // ID unit untuk filter query
  isConsolidating: boolean,        // true jika mode konsolidasi
  currentUnit: BusinessUnit | null // Unit yang sedang aktif
} = useUnitFilter()
```

---

## 🎨 UI/UX Guidelines

### Color Schemes per Unit

| Unit | Primary Color | Gradient | Icon |
|------|---------------|----------|------|
| DAGANG | Blue | `from-blue-500 to-blue-600` | ShoppingCart |
| PANGAN | Green | `from-green-500 to-green-600` | Leaf |
| JASA | Purple | `from-purple-500 to-purple-600` | Briefcase |
| SP | Orange | `from-orange-500 to-orange-600` | PiggyBank |

### Login Page Template

Setiap login page harus konsisten:

```tsx
<div className="min-h-screen bg-gradient-to-br from-{color}-500 to-{color}-600 flex items-center justify-center p-4">
  <Card className="w-full max-w-md">
    <CardHeader className="text-center">
      <IconName className="w-16 h-16 mx-auto mb-4 text-{color}-500" />
      <CardTitle className="text-2xl">Login Unit {UnitName}</CardTitle>
      <CardDescription>Masuk ke sistem unit {unitName}</CardDescription>
    </CardHeader>
    <CardContent>
      {/* Login form */}
    </CardContent>
  </Card>
</div>
```

### Dashboard Layout

```tsx
<UnitLayout title="Dashboard Unit {Name}" unitKode="{KODE}">
  {/* KPI Cards - 4 columns */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {/* StatCard components */}
  </div>

  {/* Module Cards - 3 columns */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* ModuleCard components */}
  </div>
</UnitLayout>
```

---

## 🔄 Data Flow & State Management

### Unit Context Flow

```
User clicks unit card (/auth)
    ↓
Navigate to /{unit}/login
    ↓
Login success → setCurrentUnitKode("{KODE}")
    ↓
Navigate to /{unit}/dashboard
    ↓
UnitLayout validates unit context
    ↓
Dashboard renders with unit-specific data
    ↓
All queries auto-filtered by useUnitFilter()
```

### Query Pattern

```typescript
// Always use this pattern for unit-aware queries
const { unitIdFilter, isConsolidating } = useUnitFilter()

const { data } = useQuery({
  queryKey: ['table', unitIdFilter], // Include unitIdFilter in key
  queryFn: () => supabase
    .from('table')
    .select('*')
    .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
})
```

### Mutation Pattern

```typescript
// Always include business_unit_id in inserts
const { resolveWriteUnitId } = useUnit()

const createRecord = async (data: any) => {
  const unitId = resolveWriteUnitId()
  if (!unitId) throw new Error('No unit selected')

  return supabase
    .from('table')
    .insert({ ...data, business_unit_id: unitId })
}
```

---

## 🧪 Testing Guidelines

### Unit Testing

```typescript
describe('useUnitFilter', () => {
  it('should return correct unitIdFilter', () => {
    const { result } = renderHook(() => useUnitFilter(), {
      wrapper: UnitProvider
    })

    expect(result.current.unitIdFilter).toBe('unit-id')
    expect(result.current.isConsolidating).toBe(false)
  })
})
```

### Integration Testing

```typescript
describe('Unit Dashboard', () => {
  it('should filter data by unit', async () => {
    render(<DagangDashboard />, { wrapper: UnitProvider })

    await waitFor(() => {
      expect(screen.getByText('Unit Perdagangan')).toBeInTheDocument()
    })

    // Verify data is filtered
    expect(mockSupabase.from).toHaveBeenCalledWith('sales')
    expect(mockSupabase.match).toHaveBeenCalledWith({
      business_unit_id: 'dagang-unit-id'
    })
  })
})
```

### E2E Testing

```typescript
describe('Multi-Unit Flow', () => {
  it('should navigate between units', () => {
    cy.visit('/auth')
    cy.contains('Unit Perdagangan').click()
    cy.url().should('include', '/dagang/login')

    cy.get('input[name=email]').type('user@example.com')
    cy.get('input[name=password]').type('password')
    cy.get('button[type=submit]').click()

    cy.url().should('include', '/dagang/dashboard')
    cy.contains('Dashboard Unit Perdagangan').should('be.visible')
  })
})
```

---

## 🚀 Deployment & CI/CD

### Build Process

```bash
# Install dependencies
bun install

# Type check
bun run type-check

# Lint
bun run lint

# Build
bun run build

# Preview
bun run preview
```

### Environment Variables

```env
# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# Auth
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# App
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

### Database Migrations

```bash
# Run migrations
supabase db push

# Generate new migration
supabase db diff -f new_migration_name

# Reset database
supabase db reset
```

---

## 📋 Development Checklist

### Adding New Feature Page

- [ ] Create route file `src/routes/{unit}.{feature}.tsx`
- [ ] Use `UnitLayout` wrapper
- [ ] Implement `useUnitFilter()` for data queries
- [ ] Add business_unit_id to all mutations
- [ ] Update unit modules config if needed
- [ ] Add to sidebar navigation
- [ ] Test unit isolation
- [ ] Add unit tests

### Adding New Unit

- [ ] Add to database `business_units` table
- [ ] Update `UNIT_MODULES` config
- [ ] Create 4 route files (layout, login, dashboard, index)
- [ ] Update auth.tsx unit selection
- [ ] Test login flow
- [ ] Test dashboard rendering
- [ ] Verify data filtering

### Database Changes

- [ ] Ensure all tables have `business_unit_id` column
- [ ] Update RLS policies for unit isolation
- [ ] Create migration file
- [ ] Test with sample data
- [ ] Update seed data if needed

---

## 🐛 Troubleshooting

### Common Issues

#### Unit Context Not Set
```
Error: Unit context not found
```
**Solution:** Ensure `UnitProvider` wraps the component tree

#### Data Not Filtered
```
Query returns data from all units
```
**Solution:** Use `useUnitFilter()` instead of manual filtering

#### Login Redirect Loop
```
Infinite redirect between login and dashboard
```
**Solution:** Check auth state and unit context in beforeLoad

#### Sidebar Not Updating
```
Sidebar shows wrong unit menus
```
**Solution:** Ensure `currentUnitKode` is set correctly

---

## 📚 Resources

- [TanStack Router Docs](https://tanstack.com/router)
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-unit`)
3. Commit changes (`git commit -m 'Add new unit support'`)
4. Push to branch (`git push origin feature/new-unit`)
5. Create Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Use functional components with hooks
- Implement proper error handling
- Add JSDoc comments for complex functions
- Write unit tests for new features

---

Generated on: 2026-05-09
        ├── components/
        │   ├── SalesForm.tsx
        │   ├── SalesList.tsx
        │   └── SalesDetail.tsx
        ├── hooks/
        │   ├── useSalesData.ts
        │   └── useSalesForm.ts
        └── types/
            └── sales.ts
```

---

## Testing Unit Features

### Test 1: Check Unit Context Switching

```text
1. Go to /unit/pangan/dashboard
2. Verify currentUnitKode === "PANGAN"
3. Open sidebar, verify "Unit Ketahanan Pangan" is highlighted
4. Click another unit
5. Verify URL changes to /unit/perdagangan/dashboard
6. Verify currentUnitKode === "DAGANG"
```

### Test 2: Data Isolation

```text
1. Login as user with PANGAN unit
2. Go to /unit/pangan/dashboard
3. Check transaction data - should be PANGAN only
4. Switch to /unit/dagang/dashboard
5. Check data - should be DAGANG only
6. Switch to "Semua Unit" (ALL)
7. Check data - should be sum of all units
```

### Test 3: Route Navigation

```text
1. Test /unit/pangan redirects to /unit/pangan/dashboard ✓
2. Test /unit/{invalid} shows 404 ✓
3. Test sidebar menu click navigates correctly ✓
4. Test browser back button works ✓
```

---

## Debugging Tips

### Check Current Unit Context

```typescript
// Di console browser
const { useUnit } = await import('@/lib/unit-context');
const ctx = useUnit();
console.log('Current Unit:', ctx.currentUnitKode);
console.log('Is Consolidating:', ctx.isConsolidating);
console.log('All Units:', ctx.units);
```

### Check Route Matching

```typescript
import { useRoute } from "@tanstack/react-router";

function DebugRoute() {
  const route = useRoute();
  console.log('Current Route:', route.id);
  console.log('Route Params:', route.params);
}
```

### LocalStorage Unit Selection

```javascript
// Check saved unit
localStorage.getItem('bumdes:active_unit')
localStorage.getItem('bumdes:active_unit_kode')

// Clear & reset
localStorage.removeItem('bumdes:active_unit')
localStorage.removeItem('bumdes:active_unit_kode')
```

---

## Common Issues & Solutions

### Issue: Data masih global (tidak terfilter per unit)

**Solution:**
```typescript
// ❌ WRONG - No unit filter
const { data } = await supabase.from('journals').select('*');

// ✅ CORRECT - Use whereUnit()
const { whereUnit } = useUnitQueryFilter();
const { data } = await supabase.from('journals').select('*').match(whereUnit());
```

### Issue: Sidebar tidak memperlihatkan unitmu

**Solution:**
1. Pastikan unit ada di database: `SELECT * FROM business_units WHERE kode = 'YOURUNIT'`
2. Pastikan `is_active = true`
3. Pastikan unit code ada di UNIT_MODULES
4. Clear browser cache: Ctrl+Shift+R

### Issue: Route tidak ditemukan

**Solution:**
1. Pastikan file route ada di `src/routes/`
2. Pastikan naming convention: `_app.unit.{slug}.{feature}.tsx`
3. Run: `npm run build` untuk generate routeTree
4. Check console untuk error messages

---

## Next Development Steps

1. **Create transaction input pages** - `/unit/{slug}/transactions`
2. **Create journal management pages** - `/unit/{slug}/journals`
3. **Create report pages** - `/unit/{slug}/reports`
4. **Migrate existing queries** - Update semua query untuk use `whereUnit()`
5. **Add unit-specific business logic** - Custom features per unit
6. **Add RLS policies** - Row-level security per unit
7. **Create API endpoints** - Backend yang aware unit context

---

## Resources

- 📋 Full Architecture: [ARCHITECTURE.md](../ARCHITECTURE.md)
- 🎯 Unit Modules Config: [src/lib/unit-modules.ts](../src/lib/unit-modules.ts)
- 📚 Unit Context: [src/lib/unit-context.tsx](../src/lib/unit-context.tsx)
- 🎨 Shared Components: [src/shared/components/](../src/shared/components/)
- 📘 Shared Hooks: [src/shared/hooks/](../src/shared/hooks/)

---

Happy Coding! 🎉
