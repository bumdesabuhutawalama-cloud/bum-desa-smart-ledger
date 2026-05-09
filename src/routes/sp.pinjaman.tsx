// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, PiggyBank, Users, DollarSign } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/sp/pinjaman')({
  component: PinjamanSP,
})

function PinjamanSP() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query pinjaman dengan auto filter per unit
  const { data: pinjaman, isLoading } = useQuery({
    queryKey: ['pinjaman-sp', unitIdFilter],
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
        .eq('jenis_transaksi', 'PINJAMAN')
        .order('tanggal', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    }
  })

  // Hitung statistik pinjaman
  const totalPinjaman = pinjaman?.reduce((sum, item) => sum + (item.total || 0), 0) || 0
  const pinjamanAktif = pinjaman?.filter(item => item.status === 'AKTIF').length || 0
  const pinjamanLunas = pinjaman?.filter(item => item.status === 'LUNAS').length || 0
  const uniqueAnggota = new Set(pinjaman?.map(item => item.customer_id)).size

  const handleTambahPinjaman = () => {
    navigate({ to: '/sp/pinjaman/baru' })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AKTIF':
        return <Badge variant="default">Aktif</Badge>
      case 'LUNAS':
        return <Badge variant="secondary">Lunas</Badge>
      case 'MACET':
        return <Badge variant="destructive">Macet</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <UnitLayout title="Pinjaman" unitKode="SP">
      <div className="space-y-6">
        {/* Header dengan tombol tambah */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pinjaman</h2>
            <p className="text-muted-foreground">
              Kelola pinjaman dan pengembalian dana masyarakat
            </p>
          </div>
          <Button onClick={handleTambahPinjaman} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Pinjaman
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pinjaman</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {totalPinjaman.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Total dana yang dipinjamkan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pinjaman Aktif</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pinjamanAktif}
              </div>
              <p className="text-xs text-muted-foreground">
                Pinjaman yang masih aktif
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
                Jumlah anggota yang memiliki pinjaman
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pinjaman Lunas</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pinjamanLunas}
              </div>
              <p className="text-xs text-muted-foreground">
                Pinjaman yang sudah lunas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Pinjaman */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pinjaman</CardTitle>
            <CardDescription>
              Riwayat pinjaman dan status pengembalian
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data pinjaman...
              </div>
            ) : pinjaman && pinjaman.length > 0 ? (
              <div className="space-y-4">
                {pinjaman.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.customer_name || 'Anggota'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.tanggal).toLocaleDateString('id-ID')} • {item.deskripsi || 'Pinjaman'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">
                          Rp {(item.total || 0).toLocaleString('id-ID')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Pokok pinjaman
                        </p>
                      </div>
                      {getStatusBadge(item.status || 'AKTIF')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada data pinjaman</p>
                <p className="text-sm">Klik "Tambah Pinjaman" untuk membuat pinjaman pertama</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnitLayout>
  )
}