// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Minus } from 'lucide-react'

export const Route = createFileRoute('/pangan/jurnal')({
  component: JurnalPangan,
})

function JurnalPangan() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()

  // Query jurnal pangan dengan auto filter per unit
  const { data: journals, isLoading } = useQuery({
    queryKey: ['jurnal-pangan', unitIdFilter],
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
        .order('tanggal', { ascending: false })
        .limit(100)

      if (error) throw error
      return data
    }
  })

  // Hitung total debit dan kredit
  const totals = journals?.reduce(
    (acc, journal) => {
      journal.journal_entries?.forEach(entry => {
        if (entry.debit) acc.totalDebit += entry.debit
        if (entry.kredit) acc.totalKredit += entry.kredit
      })
      return acc
    },
    { totalDebit: 0, totalKredit: 0 }
  ) || { totalDebit: 0, totalKredit: 0 }

  return (
    <UnitLayout
      title="Jurnal Umum Pangan"
      description="Riwayat semua transaksi jurnal unit ketahanan pangan"
      unitKode="PANGAN"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
            <Plus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {totals.totalDebit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total penerimaan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kredit</CardTitle>
            <Minus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              Rp {totals.totalKredit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total pengeluaran</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.totalDebit - totals.totalKredit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rp {(totals.totalDebit - totals.totalKredit).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Selisih debit-kredit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Transaksi</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total entries</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Jurnal</CardTitle>
          <CardDescription>Detail semua transaksi jurnal unit pangan</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : journals?.length ? (
            <div className="space-y-6">
              {journals.map((journal) => (
                <div key={journal.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{journal.deskripsi}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(journal.tanggal).toLocaleDateString('id-ID')} •
                        {journal.jenis_transaksi}
                      </p>
                    </div>
                    <Badge variant="outline">{journal.status}</Badge>
                  </div>

                  <div className="space-y-2">
                    {journal.journal_entries?.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">{entry.accounts?.nama}</p>
                          <p className="text-sm text-muted-foreground">{entry.accounts?.kode}</p>
                        </div>
                        <div className="text-right">
                          {entry.debit > 0 && (
                            <p className="font-semibold text-green-600">
                              +Rp {entry.debit.toLocaleString()}
                            </p>
                          )}
                          {entry.kredit > 0 && (
                            <p className="font-semibold text-red-600">
                              -Rp {entry.kredit.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data jurnal
            </div>
          )}
        </CardContent>
      </Card>
    </UnitLayout>
  )
}