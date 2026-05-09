// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Truck, TrendingDown } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/dagang/pembelian')({
  component: PembelianDagang,
})

function PembelianDagang() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query pembelian dengan auto filter per unit
  const { data: pembelian, isLoading } = useQuery({
    queryKey: ['pembelian-dagang', unitIdFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journals')
        .select(`
          *,
          journal_entries:journal_lines (
            *,
            accounts (nama:nama_akun, kode:kode_akun)
          )
        `)
        .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
        .order('tanggal', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    }
  })

  // Hitung total pembelian bulan ini
  const totalBulanIni = pembelian?.reduce((sum, item) => {
    const thisMonth = new Date().getMonth()
    const itemMonth = new Date(item.tanggal).getMonth()
    if (itemMonth === thisMonth) {
      return sum + (item.total || 0)
    }
    return sum
  }, 0) || 0

  const handleTambahPembelian = () => {
    navigate({ to: '/dagang/pembelian/baru' })
  }

  return (
    <UnitLayout title="Pembelian" unitKode="DAGANG">
      <div className="space-y-6">
        {/* Header dengan tombol tambah */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pembelian</h2>
            <p className="text-muted-foreground">
              Kelola pembelian dan faktur supplier unit perdagangan
            </p>
          </div>
          <Button onClick={handleTambahPembelian} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Pembelian
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bulan Ini</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {totalBulanIni.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Pembelian bulan ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jumlah Transaksi</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pembelian?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total transaksi pembelian
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {pembelian?.length ?
                  Math.round(totalBulanIni / pembelian.length).toLocaleString('id-ID') :
                  '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Rata-rata per transaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Pembelian */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembelian</CardTitle>
            <CardDescription>
              Daftar transaksi pembelian terbaru
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data pembelian...
              </div>
            ) : pembelian && pembelian.length > 0 ? (
              <div className="space-y-4">
                {pembelian.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.keterangan || 'Pembelian'}
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
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada data pembelian</p>
                <p className="text-sm">Klik "Tambah Pembelian" untuk membuat transaksi pertama</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}