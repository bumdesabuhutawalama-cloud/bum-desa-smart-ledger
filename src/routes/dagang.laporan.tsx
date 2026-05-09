// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, Download, TrendingUp, TrendingDown } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/dagang/laporan')({
  component: LaporanDagang,
})

function LaporanDagang() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const [periode, setPeriode] = useState('bulan-ini')

  // Query data laporan dengan auto filter per unit
  const { data: laporanData, isLoading } = useQuery({
    queryKey: ['laporan-dagang', unitIdFilter, periode],
    queryFn: async () => {
      // Get date range based on periode
      const now = new Date()
      let startDate: Date
      let endDate: Date = new Date(now)

      switch (periode) {
        case 'bulan-ini':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'bulan-lalu':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          break
        case 'tahun-ini':
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
            accounts (nama, kode, kategori)
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
    if (!laporanData) return {
      penerimaan: 0,
      pengeluaran: 0,
      labaRugi: 0,
      penjualan: 0,
      pembelian: 0,
      biaya: 0
    }

    let penerimaan = 0
    let pengeluaran = 0
    let penjualan = 0
    let pembelian = 0
    let biaya = 0

    laporanData.forEach(journal => {
      journal.journal_entries?.forEach(entry => {
        const amount = entry.debet || entry.kredit || 0

        // Kategorisasi berdasarkan jenis transaksi dan account
        if ((journal.source || "JURNAL") === 'PENJUALAN') {
          penjualan += amount
          penerimaan += amount
        } else if ((journal.source || "JURNAL") === 'PEMBELIAN') {
          pembelian += amount
          pengeluaran += amount
        } else if ((journal.source || "JURNAL") === 'BIAYA') {
          biaya += amount
          pengeluaran += amount
        } else if (entry.accounts?.kategori === 'penerimaan') {
          penerimaan += amount
        } else if (entry.accounts?.kategori === 'pengeluaran') {
          pengeluaran += amount
        }
      })
    })

    return {
      penerimaan,
      pengeluaran,
      labaRugi: penerimaan - pengeluaran,
      penjualan,
      pembelian,
      biaya
    }
  }

  const report = calculateReport()

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export laporan')
  }

  return (
    <UnitLayout title="Laporan Keuangan" unitKode="DAGANG">
      <div className="space-y-6">
        {/* Header dengan filter periode */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Laporan Keuangan</h2>
            <p className="text-muted-foreground">
              Ringkasan keuangan dan laporan unit perdagangan
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={periode} onValueChange={setPeriode}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
                <SelectItem value="bulan-lalu">Bulan Lalu</SelectItem>
                <SelectItem value="tahun-ini">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penerimaan</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                Rp {report.penerimaan.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Total pemasukan periode ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                Rp {report.pengeluaran.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Total pengeluaran periode ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laba/Rugi</CardTitle>
              <BarChart3 className={`h-4 w-4 ${report.labaRugi >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${report.labaRugi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rp {report.labaRugi.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                {report.labaRugi >= 0 ? 'Laba bersih' : 'Rugi bersih'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {report.penerimaan > 0 ?
                  Math.round((report.labaRugi / report.penerimaan) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Persentase laba dari penerimaan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detail Laporan */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Laporan Laba Rugi */}
          <Card>
            <CardHeader>
              <CardTitle>Laporan Laba Rugi</CardTitle>
              <CardDescription>
                Ringkasan pendapatan dan biaya
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Penjualan</span>
                <span className="text-green-600">Rp {report.penjualan.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Pembelian</span>
                <span className="text-red-600">Rp {report.pembelian.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Biaya Operasional</span>
                <span className="text-red-600">Rp {report.biaya.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center py-2 font-bold text-lg border-t-2">
                <span>Laba/Rugi Bersih</span>
                <span className={report.labaRugi >= 0 ? 'text-green-600' : 'text-red-600'}>
                  Rp {report.labaRugi.toLocaleString('id-ID')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ringkasan Transaksi */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Transaksi</CardTitle>
              <CardDescription>
                Jumlah transaksi per kategori
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span>Total Transaksi</span>
                <span className="font-medium">{laporanData?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Transaksi Penjualan</span>
                <span className="font-medium">
                  {laporanData?.filter(j => (j.source || "JURNAL") === 'PENJUALAN').length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Transaksi Pembelian</span>
                <span className="font-medium">
                  {laporanData?.filter(j => (j.source || "JURNAL") === 'PEMBELIAN').length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Transaksi Biaya</span>
                <span className="font-medium">
                  {laporanData?.filter(j => (j.source || "JURNAL") === 'BIAYA').length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Memuat data laporan...
          </div>
        )}
      </div>
    </UnitLayout>
  )
}