// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, Download } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/pangan/laporan')({
  component: LaporanPangan,
})

function LaporanPangan() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const [periode, setPeriode] = useState('bulan_ini')

  // Query laporan pangan dengan auto filter per unit
  const { data: laporan, isLoading } = useQuery({
    queryKey: ['laporan-pangan', unitIdFilter, periode],
    queryFn: async () => {
      const now = new Date()
      let startDate: Date
      let endDate: Date = new Date(now)

      switch (periode) {
        case 'bulan_ini':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'bulan_lalu':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          break
        case 'tahun_ini':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      const { data, error } = await supabase
        .from('journals')
        .select(`
          *,
          journal_entries:journal_lines (
            *,
            accounts (nama, kode, jenis_akun)
          )
        `)
        .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
        .gte('tanggal', startDate.toISOString().split('T')[0])
        .lte('tanggal', endDate.toISOString().split('T')[0])

      if (error) throw error
      return data
    }
  })

  // Hitung laporan keuangan
  const calculateReport = () => {
    if (!laporan) return { penerimaan: 0, pengeluaran: 0, labaRugi: 0 }

    return laporan.reduce(
      (acc, journal) => {
        journal.journal_entries?.forEach(entry => {
          const jenisAkun = entry.accounts?.jenis_akun

          if (entry.debit > 0) {
            if (jenisAkun === 'PENDAPATAN' || jenisAkun === 'PENJUALAN') {
              acc.penerimaan += entry.debit
            } else if (jenisAkun === 'BEBAN' || jenisAkun === 'PEMBELIAN') {
              acc.pengeluaran += entry.debit
            }
          }

          if (entry.kredit > 0) {
            if (jenisAkun === 'PENDAPATAN' || jenisAkun === 'PENJUALAN') {
              acc.penerimaan += entry.kredit
            } else if (jenisAkun === 'BEBAN' || jenisAkun === 'PEMBELIAN') {
              acc.pengeluaran += entry.kredit
            }
          }
        })
        return acc
      },
      { penerimaan: 0, pengeluaran: 0, labaRugi: 0 }
    )
  }

  const report = calculateReport()
  report.labaRugi = report.penerimaan - report.pengeluaran

  return (
    <UnitLayout
      title="Laporan Keuangan Pangan"
      description="Laporan laba rugi dan ringkasan transaksi unit ketahanan pangan"
      unitKode="PANGAN"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Laporan Keuangan</h2>
          <p className="text-sm text-muted-foreground">Ringkasan keuangan unit pangan</p>
        </div>
        <div className="flex gap-3">
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
              <SelectItem value="bulan_lalu">Bulan Lalu</SelectItem>
              <SelectItem value="tahun_ini">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penerimaan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {report.penerimaan.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Penjualan dan pendapatan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              Rp {report.pengeluaran.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Pembelian dan beban</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba/Rugi</CardTitle>
            <TrendingUp className={`h-4 w-4 ${report.labaRugi >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.labaRugi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rp {report.labaRugi.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {report.labaRugi >= 0 ? 'Laba bersih' : 'Rugi bersih'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Transaksi</CardTitle>
            <CardDescription>Detail transaksi dalam periode ini</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Memuat data...</div>
            ) : laporan?.length ? (
              <div className="space-y-4">
                {laporan.slice(0, 10).map((journal) => (
                  <div key={journal.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{journal.keterangan}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(journal.tanggal).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Rp {journal.total?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{journal.jenis_transaksi}</p>
                    </div>
                  </div>
                ))}
                {laporan.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Dan {laporan.length - 10} transaksi lainnya...
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada transaksi dalam periode ini
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perbandingan Periode</CardTitle>
            <CardDescription>Trend keuangan unit pangan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm">Rata-rata transaksi per hari</span>
                <span className="font-semibold">
                  Rp {laporan?.length ? Math.round(report.penerimaan / 30).toLocaleString() : '0'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm">Margin keuntungan</span>
                <span className="font-semibold">
                  {report.penerimaan > 0 ? Math.round((report.labaRugi / report.penerimaan) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm">Total transaksi</span>
                <span className="font-semibold">{laporan?.length || 0} entries</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}