// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, AlertTriangle, TrendingUp } from 'lucide-react'

export const Route = createFileRoute('/pangan/persediaan')({
  component: PersediaanPangan,
})

function getStockStatus(stok: number, minStok: number = 10) {
  if (stok <= 0) return { status: 'Habis', color: 'destructive' }
  if (stok <= minStok) return { status: 'Rendah', color: 'warning' }
  return { status: 'Tersedia', color: 'default' }
}

function PersediaanPangan() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()

  // Query persediaan pangan dengan auto filter per unit
  const { data: persediaan, isLoading } = useQuery({
    queryKey: ['persediaan-pangan', unitIdFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
        .eq('kategori', 'PANGAN')
        .order('nama', { ascending: true })

      if (error) throw error
      return data
    }
  })

  // Hitung statistik
  const totalItems = persediaan?.length || 0
  const lowStockItems = persediaan?.filter(item => item.stok <= 10).length || 0
  const outOfStockItems = persediaan?.filter(item => item.stok <= 0).length || 0
  const totalValue = persediaan?.reduce((sum, item) => sum + (item.stok * item.harga_beli), 0) || 0

  return (
    <UnitLayout
      title="Persediaan Pangan"
      description="Kelola stok bahan pangan dan hasil pertanian"
      unitKode="PANGAN"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Item</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Jenis bahan pangan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Perlu restock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Habis Stok</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">Stok kosong</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Persediaan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total nilai stok</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Persediaan</CardTitle>
          <CardDescription>Status stok bahan pangan saat ini</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : persediaan?.length ? (
            <div className="space-y-4">
              {persediaan.map((item) => {
                const stockStatus = getStockStatus(item.stok, item.min_stok)
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{item.nama}</h3>
                        <Badge variant={stockStatus.color as any}>
                          {stockStatus.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.keterangan}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.stok} {item.satuan}</p>
                      <p className="text-sm text-muted-foreground">
                        Min: {item.min_stok} {item.satuan}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data persediaan
            </div>
          )}
        </CardContent>
      </Card>
    </UnitLayout>
  )
}