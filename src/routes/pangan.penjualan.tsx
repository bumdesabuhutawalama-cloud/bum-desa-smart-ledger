import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Leaf, TrendingUp } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/pangan/penjualan')({
  component: PenjualanPangan,
})

function PenjualanPangan() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query penjualan pangan dengan auto filter per unit
  const { data: penjualan, isLoading } = useQuery({
    queryKey: ['penjualan-pangan', unitIdFilter],
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
        .eq('jenis_transaksi', 'PENJUALAN_PANGAN')
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

  // Hitung jumlah petani/kelompok tani yang terlibat
  const uniqueCustomers = new Set(penjualan?.map(item => item.customer_id)).size

  const handleTambahPenjualan = () => {
    navigate({ to: '/pangan/penjualan/baru' })
  }

  return (
    <UnitLayout title="Penjualan Pangan" unitKode="PANGAN">
      <div className="space-y-6">
        {/* Header dengan tombol tambah */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Penjualan Pangan</h2>
            <p className="text-muted-foreground">
              Kelola penjualan hasil pertanian dan ketahanan pangan
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
              <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {totalHariIni.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Hasil penjualan hari ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Petani Aktif</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {uniqueCustomers}
              </div>
              <p className="text-xs text-muted-foreground">
                Petani/kelompok tani aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {penjualan?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah transaksi penjualan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Penjualan Pangan */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Penjualan Pangan</CardTitle>
            <CardDescription>
              Daftar transaksi penjualan hasil pertanian
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
                        {item.deskripsi || 'Penjualan Pangan'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.tanggal).toLocaleDateString('id-ID')} • {item.customer_name || 'Petani'}
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
                <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada data penjualan pangan</p>
                <p className="text-sm">Klik "Tambah Penjualan" untuk mencatat hasil panen pertama</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}