// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, PiggyBank, Users, TrendingUp } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/sp/simpanan')({
  component: SimpananSP,
})

function SimpananSP() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query simpanan dengan auto filter per unit
  const { data: simpanan, isLoading } = useQuery({
    queryKey: ['simpanan-sp', unitIdFilter],
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
        .eq('jenis_transaksi', 'SIMPANAN')
        .order('tanggal', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    }
  })

  // Hitung statistik simpanan
  const totalSimpanan = simpanan?.reduce((sum, item) => sum + (item.total || 0), 0) || 0
  const simpananBulanIni = simpanan?.reduce((sum, item) => {
    const thisMonth = new Date().getMonth()
    const itemMonth = new Date(item.tanggal).getMonth()
    if (itemMonth === thisMonth) {
      return sum + (item.total || 0)
    }
    return sum
  }, 0) || 0
  const uniqueAnggota = new Set(simpanan?.map(item => item.customer_id)).size

  const handleTambahSimpanan = () => {
    navigate({ to: '/sp/simpanan/baru' })
  }

  return (
    <UnitLayout title="Simpanan" unitKode="SP">
      <div className="space-y-6">
        {/* Header dengan tombol tambah */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Simpanan</h2>
            <p className="text-muted-foreground">
              Kelola simpanan dan tabungan masyarakat
            </p>
          </div>
          <Button onClick={handleTambahSimpanan} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Simpanan
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Simpanan</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {totalSimpanan.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Total dana yang disimpan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Simpanan Bulan Ini</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {simpananBulanIni.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Dana yang masuk bulan ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anggota Aktif</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {uniqueAnggota}
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah anggota yang menabung
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Simpanan</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {uniqueAnggota > 0 ?
                  Math.round(totalSimpanan / uniqueAnggota).toLocaleString('id-ID') :
                  '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Rata-rata per anggota
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Simpanan */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Simpanan</CardTitle>
            <CardDescription>
              Daftar transaksi simpanan dan penarikan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data simpanan...
              </div>
            ) : simpanan && simpanan.length > 0 ? (
              <div className="space-y-4">
                {simpanan.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.customer_name || 'Anggota'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.tanggal).toLocaleDateString('id-ID')} • {item.deskripsi || 'Simpanan'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        +Rp {(item.total || 0).toLocaleString('id-ID')}
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
                <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada data simpanan</p>
                <p className="text-sm">Klik "Tambah Simpanan" untuk mencatat simpanan pertama</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}