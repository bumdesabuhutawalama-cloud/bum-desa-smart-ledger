// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Briefcase, TrendingDown } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/jasa/biaya')({
  component: BiayaJasa,
})

function BiayaJasa() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query biaya jasa dengan auto filter per unit
  const { data: biaya, isLoading } = useQuery({
    queryKey: ['biaya-jasa', unitIdFilter],
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
        .eq('jenis_transaksi', 'BIAYA_JASA')
        .order('tanggal', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    }
  })

  // Hitung total biaya bulan ini
  const totalBulanIni = biaya?.reduce((sum, item) => {
    const thisMonth = new Date().getMonth()
    const thisYear = new Date().getFullYear()
    const itemDate = new Date(item.tanggal)
    if (itemDate.getMonth() === thisMonth && itemDate.getFullYear() === thisYear) {
      return sum + (item.total || 0)
    }
    return sum
  }, 0) || 0

  return (
    <UnitLayout
      title="Biaya Operasional Jasa"
      description="Kelola biaya operasional, maintenance, dan pengeluaran unit jasa"
      unitKode="JASA"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biaya Bulan Ini</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Rp {totalBulanIni.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total pengeluaran operasional</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi Hari Ini</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{biaya?.filter(item => {
              const today = new Date().toDateString()
              return new Date(item.tanggal).toDateString() === today
            }).length || 0}</div>
            <p className="text-xs text-muted-foreground">Biaya hari ini</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Daftar Biaya Operasional</h2>
          <p className="text-sm text-muted-foreground">Riwayat biaya operasional unit jasa</p>
        </div>
        <Button onClick={() => navigate({ to: '/jasa/biaya/baru' })}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Biaya
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : biaya?.length ? (
            <div className="space-y-4">
              {biaya.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.deskripsi}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">Rp {item.total?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{item.jenis_transaksi}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data biaya operasional
            </div>
          )}
        </CardContent>
      </Card>
    </UnitLayout>
  )
}