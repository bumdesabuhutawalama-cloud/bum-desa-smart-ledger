// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { UnitLayout } from '@/shared/layouts/UnitLayout'
import { useUnitFilter } from '@/shared/hooks/useUnitFilter'
import { useUnit } from '@/lib/unit-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

type PenjualanForm = {
  tanggal: string
  deskripsi: string
  customer: string
  items: Array<{
    nama: string
    qty: number
    harga: number
    total: number
  }>
  total: number
  status: string
}

export const Route = createFileRoute('/dagang/penjualan/baru')({
  component: PenjualanBaru,
})

function PenjualanBaru() {
  const { resolveWriteUnitId } = useUnit()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [items, setItems] = useState<Array<{nama: string, qty: number, harga: number, total: number}>>([
    { nama: '', qty: 1, harga: 0, total: 0 }
  ])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PenjualanForm>({
    defaultValues: {
      tanggal: new Date().toISOString().split('T')[0],
      deskripsi: '',
      customer: '',
      total: 0,
      status: 'POSTED'
    }
  })

  // Query accounts untuk dropdown (kolom: kode_akun, nama_akun)
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, nama_akun, kode_akun')
        .eq('is_active', true)
        .order('kode_akun')

      if (error) throw error
      return data
    }
  })

  // Helper: cari account berdasarkan prefix kode (mis. 1101 utk Kas, 1102 utk Bank, dst.)
  const findAccount = (prefixes: string[]) => {
    if (!accounts) return null
    for (const p of prefixes) {
      const a = accounts.find((x: any) => x.kode_akun?.startsWith(p))
      if (a) return a
    }
    return null
  }

  // Mutation untuk simpan penjualan
  const createPenjualan = useMutation({
    mutationFn: async (data: PenjualanForm) => {
      const unitId = resolveWriteUnitId()
      if (!unitId) throw new Error('Unit usaha tidak ditemukan')

      const akunPiutang = findAccount(['113', '112'])      // Piutang Usaha
      const akunPendapatan = findAccount(['41', '4'])      // Pendapatan / Penjualan
      if (!akunPiutang || !akunPendapatan) {
        throw new Error('Akun Piutang atau Penjualan belum tersedia di Daftar Akun (COA).')
      }

      const nomor = `JV-${Date.now()}`

      // Insert journal header
      const { data: journal, error: journalError } = await supabase
        .from('journals')
        .insert({
          business_unit_id: unitId,
          tanggal: data.tanggal,
          nomor_jurnal: nomor,
          keterangan: data.deskripsi || `Penjualan ${data.customer || ''}`.trim(),
          status: 'POSTED',
          source: 'PENJUALAN',
        })
        .select()
        .single()

      if (journalError) throw journalError

      // Insert journal lines (debit Piutang, kredit Pendapatan)
      const lines = [
        {
          journal_id: journal.id,
          account_id: akunPiutang.id,
          debit: data.total,
          kredit: 0,
          keterangan: `Piutang dari ${data.customer || '-'}`,
          line_order: 1,
        },
        {
          journal_id: journal.id,
          account_id: akunPendapatan.id,
          debit: 0,
          kredit: data.total,
          keterangan: `Penjualan ${data.deskripsi || ''}`.trim(),
          line_order: 2,
        },
      ]

      const { error: linesError } = await supabase.from('journal_lines').insert(lines)
      if (linesError) throw linesError

      return journal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penjualan-dagang'] })
      navigate({ to: '/dagang/penjualan' })
    },
    onError: (e: any) => {
      alert(`Gagal menyimpan: ${e.message}`)
    },
  })

  const addItem = () => {
    setItems([...items, { nama: '', qty: 1, harga: 0, total: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'qty' || field === 'harga') {
      newItems[index].total = newItems[index].qty * newItems[index].harga
    }

    setItems(newItems)

    // Update total form
    const total = newItems.reduce((sum, item) => sum + item.total, 0)
    setValue('total', total)
  }

  const onSubmit = (data: PenjualanForm) => {
    createPenjualan.mutate({ ...data, items })
  }

  return (
    <UnitLayout title="Penjualan Baru" unitKode="DAGANG">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/dagang/penjualan' })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Penjualan Baru</h2>
            <p className="text-muted-foreground">
              Buat transaksi penjualan baru
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informasi Dasar */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Penjualan</CardTitle>
              <CardDescription>
                Data dasar transaksi penjualan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    {...register('tanggal', { required: 'Tanggal wajib diisi' })}
                  />
                  {errors.tanggal && (
                    <p className="text-sm text-red-500">{errors.tanggal.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Input
                    id="customer"
                    placeholder="Nama customer"
                    {...register('customer', { required: 'Customer wajib diisi' })}
                  />
                  {errors.customer && (
                    <p className="text-sm text-red-500">{errors.customer.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Textarea
                  id="deskripsi"
                  placeholder="Deskripsi penjualan"
                  {...register('deskripsi', { required: 'Deskripsi wajib diisi' })}
                />
                {errors.deskripsi && (
                  <p className="text-sm text-red-500">{errors.deskripsi.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select onValueChange={(value) => setValue('status', value)} defaultValue="LUNAS">
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LUNAS">Lunas</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="BATAL">Batal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Items Penjualan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Item Penjualan</CardTitle>
                  <CardDescription>
                    Daftar barang yang dijual
                  </CardDescription>
                </div>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Label>Nama Barang</Label>
                      <Input
                        placeholder="Nama barang"
                        value={item.nama}
                        onChange={(e) => updateItem(index, 'nama', e.target.value)}
                      />
                    </div>

                    <div className="w-24 space-y-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="w-32 space-y-2">
                      <Label>Harga</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.harga}
                        onChange={(e) => updateItem(index, 'harga', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="w-32 space-y-2">
                      <Label>Total</Label>
                      <Input
                        type="number"
                        value={item.total}
                        readOnly
                        className="bg-muted"
                      />
                    </div>

                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Penjualan</p>
                    <p className="text-2xl font-bold">
                      Rp {watch('total')?.toLocaleString('id-ID') || '0'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/dagang/penjualan' })}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createPenjualan.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createPenjualan.isPending ? 'Menyimpan...' : 'Simpan Penjualan'}
            </Button>
          </div>
        </form>
      </div>
    </UnitLayout>
  )
}