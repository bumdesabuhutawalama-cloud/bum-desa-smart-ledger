// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Plus, Calendar, Users } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/jasa/kontrak')({
  component: KontrakJasa,
})

function KontrakJasa() {
  const { unitIdFilter, isConsolidating } = useUnitFilter()
  const navigate = useNavigate()

  // Query kontrak jasa dengan auto filter per unit
  const { data: kontrak, isLoading } = useQuery({
    queryKey: ['kontrak-jasa', unitIdFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_contracts')
        .select('*')
        .match(isConsolidating ? {} : { business_unit_id: unitIdFilter })
        .order('tanggal_mulai', { ascending: false })

      if (error) throw error
      return data
    }
  })

  // Hitung statistik kontrak
  const kontrakAktif = kontrak?.filter(k => k.status === 'aktif').length || 0
  const kontrakSelesai = kontrak?.filter(k => k.status === 'selesai').length || 0
  const totalNilai = kontrak?.reduce((sum, k) => sum + (k.nilai_kontrak || 0), 0) || 0

  return (
    <UnitLayout
      title="Manajemen Kontrak Jasa"
      description="Kelola kontrak, perjanjian, dan klien unit jasa & sewa"
      unitKode="JASA"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kontrak Aktif</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kontrakAktif}</div>
            <p className="text-xs text-muted-foreground">Kontrak berjalan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kontrak Selesai</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kontrakSelesai}</div>
            <p className="text-xs text-muted-foreground">Kontrak selesai</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Kontrak</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalNilai.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Nilai total kontrak</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Klien Aktif</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(kontrak?.filter(k => k.status === 'aktif').map(k => k.nama_klien)).size || 0}
            </div>
            <p className="text-xs text-muted-foreground">Klien dengan kontrak aktif</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Daftar Kontrak</h2>
          <p className="text-sm text-muted-foreground">Manajemen kontrak dan perjanjian jasa</p>
        </div>
        <Button onClick={() => navigate({ to: '/jasa/kontrak/baru' })}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Kontrak
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : kontrak?.length ? (
            <div className="space-y-4">
              {kontrak.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{item.nama_kontrak}</h3>
                      <Badge variant={item.status === 'aktif' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{item.nama_klien}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.tanggal_mulai).toLocaleDateString('id-ID')} - {new Date(item.tanggal_selesai).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Rp {item.nilai_kontrak?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{item.jenis_jasa}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data kontrak
            </div>
          )}
        </CardContent>
      </Card>
    </UnitLayout>
  )
}