// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Leaf, TrendingDown } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/pangan/pembelian')({
  component: PembelianPangan,
})

function PembelianPangan() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query pembelian pangan dengan auto filter per unit
  const { data: pembelian, isLoading } = useQuery({
    queryKey: ['pembelian-pangan', unitIdFilter],
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
    const thisYear = new Date().getFullYear()
    const itemDate = new Date(item.tanggal)
    if (itemDate.getMonth() === thisMonth && itemDate.getFullYear() === thisYear) {
      return sum + (((item.journal_entries||[]).reduce((a,e)=>a+Number(e.debit||0),0)) || 0)
    }
    return sum
  }, 0) || 0

  return (
    <UnitLayout
      title="Pembelian Bahan Pangan"
      description="Kelola pembelian bibit, pupuk, dan bahan pertanian"
      unitKode="PANGAN"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pembelian Bulan Ini</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalBulanIni.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total pembelian bahan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi Hari Ini</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pembelian?.filter(item => {
              const today = new Date().toDateString()
              return new Date(item.tanggal).toDateString() === today
            }).length || 0}</div>
            <p className="text-xs text-muted-foreground">Pembelian hari ini</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Daftar Pembelian</h2>
          <p className="text-sm text-muted-foreground">Riwayat pembelian bahan pangan</p>
        </div>
        <Button onClick={() => navigate({ to: '/pangan/pembelian/baru' })}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pembelian
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : pembelian?.length ? (
            <div className="space-y-4">
              {pembelian.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.keterangan}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Rp {((item.journal_entries||[]).reduce((a,e)=>a+Number(e.debit||0),0))?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{(item.source || "JURNAL")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data pembelian
            </div>
          )}
        </CardContent>
      </Card>
    </UnitLayout>
  )
}