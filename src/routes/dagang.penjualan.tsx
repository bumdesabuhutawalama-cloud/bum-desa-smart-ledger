// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ShoppingCart, TrendingUp } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/dagang/penjualan')({
  component: PenjualanDagang,
})

function PenjualanDagang() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query penjualan dengan auto filter per unit
  const { data: penjualan, isLoading } = useQuery({
    queryKey: ['penjualan-dagang', unitIdFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journals')
        .select(`
          *,
          journal_entries (
            *,
            accounts (nama, kode)
          )
        `)
        .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
        .eq('jenis_transaksi', 'PENJUALAN')
        .order('tanggal', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    }
  })

  // Hitung total penjualan hari ini
  const totalHariIni = penjualan?.reduce((sum, item) => {
    const today = new Date().toDateString()
    const itemDate = new Date(item.tanggal).toDateString()
    if (itemDate === today) {
      return sum + (item.total || 0)
    }
    return sum
  }, 0) || 0

  const handleTambahPenjualan = () => {
    navigate({ to: '/dagang/penjualan/baru' })
  }

  return (
    <UnitLayout title="Penjualan" unitKode="DAGANG">
      <div className="space-y-6">
        {/* Header dengan tombol tambah */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Penjualan</h2>
            <p className="text-muted-foreground">
              Kelola penjualan dan faktur unit perdagangan
            </p>
          </div>
          <Button onClick={handleTambahPenjualan} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Penjualan
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hari Ini</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {totalHariIni.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Penjualan hari ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jumlah Transaksi</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {penjualan?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total transaksi penjualan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {penjualan?.length ?
                  Math.round(totalHariIni / penjualan.length).toLocaleString('id-ID') :
                  '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Rata-rata per transaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Penjualan */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Penjualan</CardTitle>
            <CardDescription>
              Daftar transaksi penjualan terbaru
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data penjualan...
              </div>
            ) : penjualan && penjualan.length > 0 ? (
              <div className="space-y-4">
                {penjualan.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.deskripsi || 'Penjualan'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.tanggal).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        Rp {(item.total || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.status || 'Lunas'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada data penjualan</p>
                <p className="text-sm">Klik "Tambah Penjualan" untuk membuat transaksi pertama</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}