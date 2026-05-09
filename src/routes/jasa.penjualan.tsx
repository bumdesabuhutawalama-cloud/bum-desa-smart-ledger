// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Briefcase, FileText, Users } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/jasa/penjualan')({
  component: PenjualanJasa,
})

function PenjualanJasa() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query penjualan jasa dengan auto filter per unit
  const { data: penjualan, isLoading } = useQuery({
    queryKey: ['penjualan-jasa', unitIdFilter],
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

  // Hitung total pendapatan jasa bulan ini
  const totalBulanIni = penjualan?.reduce((sum, item) => {
    const thisMonth = new Date().getMonth()
    const itemMonth = new Date(item.tanggal).getMonth()
    if (itemMonth === thisMonth) {
      return sum + (item.total || 0)
    }
    return sum
  }, 0) || 0

  // Hitung jumlah klien unik
  const uniqueClients = new Set(penjualan?.map(item => item.customer_id)).size

  // Hitung jumlah kontrak aktif
  const kontrakAktif = penjualan?.filter(item => item.status === 'AKTIF').length || 0

  const handleTambahPenjualan = () => {
    navigate({ to: '/jasa/penjualan/baru' })
  }

  return (
    <UnitLayout title="Penjualan Jasa" unitKode="JASA">
      <div className="space-y-6">
        {/* Header dengan tombol tambah */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Penjualan Jasa</h2>
            <p className="text-muted-foreground">
              Kelola penjualan jasa dan kontrak unit jasa & sewa
            </p>
          </div>
          <Button onClick={handleTambahPenjualan} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Jasa
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendapatan Bulan Ini</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {totalBulanIni.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Total pendapatan jasa bulan ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Klien Aktif</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {uniqueClients}
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah klien yang menggunakan jasa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kontrak Aktif</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kontrakAktif}
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah kontrak yang masih aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {penjualan?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah transaksi jasa
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Penjualan Jasa */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Penjualan Jasa</CardTitle>
            <CardDescription>
              Daftar transaksi jasa dan kontrak
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data penjualan jasa...
              </div>
            ) : penjualan && penjualan.length > 0 ? (
              <div className="space-y-4">
                {penjualan.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.deskripsi || 'Jasa'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.tanggal).toLocaleDateString('id-ID')} • {item.customer_name || 'Klien'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        Rp {(item.total || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.status || 'Aktif'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada data penjualan jasa</p>
                <p className="text-sm">Klik "Tambah Jasa" untuk membuat kontrak pertama</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}