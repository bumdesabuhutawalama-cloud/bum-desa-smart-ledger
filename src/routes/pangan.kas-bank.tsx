// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet, CreditCard, TrendingUp, Plus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/pangan/kas-bank')({
  component: KasBankPangan,
})

function KasBankPangan() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query kas dan bank pangan dengan auto filter per unit
  const { data: kasBank, isLoading } = useQuery({
    queryKey: ['kas-bank-pangan', unitIdFilter],
    queryFn: async () => {
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
        .order('tanggal', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    }
  })

  // Hitung saldo kas dan bank
  const calculateBalances = () => {
    if (!kasBank) return { kas: 0, bank: 0, total: 0 }

    return kasBank.reduce(
      (acc, journal) => {
        journal.journal_entries?.forEach(entry => {
          const jenisAkun = entry.accounts?.jenis_akun
          const isKas = jenisAkun === 'KAS'
          const isBank = jenisAkun === 'BANK'

          if (entry.debit > 0) {
            if (isKas) acc.kas += entry.debit
            if (isBank) acc.bank += entry.debit
          }

          if (entry.kredit > 0) {
            if (isKas) acc.kas -= entry.kredit
            if (isBank) acc.bank -= entry.kredit
          }
        })
        return acc
      },
      { kas: 0, bank: 0, total: 0 }
    )
  }

  const balances = calculateBalances()
  ((balances.journal_entries||[]).reduce((a,e)=>a+Number(e.debit||0),0)) = balances.kas + balances.bank

  // Hitung transaksi hari ini
  const transaksiHariIni = kasBank?.filter(item => {
    const today = new Date().toDateString()
    return new Date(item.tanggal).toDateString() === today
  }).length || 0

  return (
    <UnitLayout
      title="Kas & Bank Pangan"
      description="Kelola transaksi kas dan rekening bank unit ketahanan pangan"
      unitKode="PANGAN"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Kas</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {balances.kas.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Uang tunai</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Bank</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              Rp {balances.bank.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Rekening bank</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {((balances.journal_entries||[]).reduce((a,e)=>a+Number(e.debit||0),0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Kas + Bank</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi Hari Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transaksiHariIni}</div>
            <p className="text-xs text-muted-foreground">Kas/Bank masuk keluar</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Riwayat Transaksi</h2>
          <p className="text-sm text-muted-foreground">Transaksi kas dan bank unit pangan</p>
        </div>
        <Button onClick={() => navigate({ to: '/pangan/kas-bank/baru' })}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Transaksi
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : kasBank?.length ? (
            <div className="space-y-4">
              {kasBank.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      (item.source || "JURNAL").includes('MASUK') ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {(item.source || "JURNAL").includes('KAS') ? (
                        <Wallet className={`h-4 w-4 ${
                          (item.source || "JURNAL").includes('MASUK') ? 'text-green-600' : 'text-red-600'
                        }`} />
                      ) : (
                        <CreditCard className={`h-4 w-4 ${
                          (item.source || "JURNAL").includes('MASUK') ? 'text-green-600' : 'text-red-600'
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{item.keterangan}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.tanggal).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={(item.source || "JURNAL").includes('MASUK') ? 'default' : 'destructive'}>
                      {(item.source || "JURNAL").replace('_', ' ')}
                    </Badge>
                    <p className={`font-semibold mt-1 ${
                      (item.source || "JURNAL").includes('MASUK') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(item.source || "JURNAL").includes('MASUK') ? '+' : '-'}Rp {((item.journal_entries||[]).reduce((a,e)=>a+Number(e.debit||0),0))?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada transaksi kas/bank
            </div>
          )}
        </CardContent>
      </Card>
    </UnitLayout>
  )
}