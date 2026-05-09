// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, AlertTriangle, CheckCircle } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/dagang/persediaan')({
  component: PersediaanDagang,
})

function PersediaanDagang() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query inventory dengan auto filter per unit
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory-dagang', unitIdFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_movements (
            id,
            quantity,
            type,
            created_at
          )
        `)
        .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
        .eq('is_active', true)
        .order('nama')

      if (error) throw error
      return data
    }
  })

  // Hitung statistik
  const totalItems = inventory?.length || 0
  const lowStockItems = inventory?.filter(item => (item.stok || 0) <= (item.minimum_stok || 0)) || []
  const outOfStockItems = inventory?.filter(item => (item.stok || 0) === 0) || []

  const handleTambahBarang = () => {
    navigate({ to: '/dagang/persediaan/baru' })
  }

  const getStockStatus = (stok: number, minStok: number) => {
    if (stok === 0) return { label: 'Habis', variant: 'destructive' as const }
    if (stok <= minStok) return { label: 'Stok Rendah', variant: 'secondary' as const }
    return { label: 'Tersedia', variant: 'default' as const }
  }

  return (
    <UnitLayout title="Persediaan" unitKode="DAGANG">
      <div className="space-y-6">
        {/* Header dengan tombol tambah */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Persediaan</h2>
            <p className="text-muted-foreground">
              Kelola stok barang dan inventory unit perdagangan
            </p>
          </div>
          <Button onClick={handleTambahBarang} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Barang
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Barang</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Jumlah item dalam inventory
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems.length}</div>
              <p className="text-xs text-muted-foreground">
                Item dengan stok rendah
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Habis Stok</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outOfStockItems.length}</div>
              <p className="text-xs text-muted-foreground">
                Item yang habis stok
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stok Aman</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalItems - lowStockItems.length - outOfStockItems.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Item dengan stok aman
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Barang</CardTitle>
            <CardDescription>
              Inventory dan stok barang unit perdagangan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data inventory...
              </div>
            ) : inventory && inventory.length > 0 ? (
              <div className="space-y-4">
                {inventory.map((item) => {
                  const stockStatus = getStockStatus(item.stok || 0, item.minimum_stok || 0)
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{item.nama}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.kategori} • {item.satuan}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            {item.stok || 0} {item.satuan}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Min: {item.minimum_stok || 0}
                          </p>
                        </div>
                        <Badge variant={stockStatus.variant}>
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada data inventory</p>
                <p className="text-sm">Klik "Tambah Barang" untuk menambah item pertama</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}