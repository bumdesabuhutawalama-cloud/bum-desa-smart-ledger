import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Minus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/dagang/jurnal')({
  component: JurnalDagang,
})

function JurnalDagang() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query jurnal dengan auto filter per unit
  const { data: journals, isLoading } = useQuery({
    queryKey: ['journals-dagang', unitIdFilter],
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

  const getTransactionTypeBadge = (jenis: string) => {
    const types = {
      'PENJUALAN': { label: 'Penjualan', variant: 'default' as const },
      'PEMBELIAN': { label: 'Pembelian', variant: 'secondary' as const },
      'PENJUALAN_PANGAN': { label: 'Penjualan Pangan', variant: 'default' as const },
      'PENJUALAN_JASA': { label: 'Penjualan Jasa', variant: 'outline' as const },
      'PINJAMAN': { label: 'Pinjaman', variant: 'destructive' as const },
      'SIMPANAN': { label: 'Simpanan', variant: 'default' as const },
      'BIAYA': { label: 'Biaya', variant: 'secondary' as const },
      'PENERIMAAN': { label: 'Penerimaan', variant: 'default' as const },
    }
    return types[jenis as keyof typeof types] || { label: jenis, variant: 'outline' as const }
  }

  return (
    <UnitLayout title="Jurnal Umum" unitKode="DAGANG">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Jurnal Umum</h2>
            <p className="text-muted-foreground">
              Riwayat semua transaksi dan jurnal entries unit perdagangan
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {journals?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah jurnal entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {journals?.reduce((sum, journal) =>
                  sum + (journal.journal_entries?.reduce((entrySum, entry) =>
                    entrySum + (entry.debet || 0), 0) || 0), 0).toLocaleString('id-ID') || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Total nilai debit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Kredit</CardTitle>
              <Minus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {journals?.reduce((sum, journal) =>
                  sum + (journal.journal_entries?.reduce((entrySum, entry) =>
                    entrySum + (entry.kredit || 0), 0) || 0), 0).toLocaleString('id-ID') || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Total nilai kredit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Jurnal */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Jurnal</CardTitle>
            <CardDescription>
              Daftar lengkap transaksi dan jurnal entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data jurnal...
              </div>
            ) : journals && journals.length > 0 ? (
              <div className="space-y-6">
                {journals.map((journal) => (
                  <div key={journal.id} className="border rounded-lg p-4">
                    {/* Journal Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{journal.deskripsi}</h3>
                          {getTransactionTypeBadge(journal.jenis_transaksi || '').label && (
                            <Badge variant={getTransactionTypeBadge(journal.jenis_transaksi || '').variant}>
                              {getTransactionTypeBadge(journal.jenis_transaksi || '').label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(journal.tanggal).toLocaleDateString('id-ID')} •
                          {journal.status || 'Aktif'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          Rp {(journal.total || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {/* Journal Entries */}
                    <div className="space-y-2">
                      {journal.journal_entries?.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-4 bg-muted/50 rounded">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">
                              {entry.accounts?.kode} - {entry.accounts?.nama}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span className={entry.debet ? 'text-red-600' : 'text-muted-foreground'}>
                              {entry.debet ? `D: Rp ${entry.debet.toLocaleString('id-ID')}` : ''}
                            </span>
                            <span className={entry.kredit ? 'text-green-600' : 'text-muted-foreground'}>
                              {entry.kredit ? `K: Rp ${entry.kredit.toLocaleString('id-ID')}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada data jurnal</p>
                <p className="text-sm">Transaksi akan muncul di sini setelah dibuat</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}