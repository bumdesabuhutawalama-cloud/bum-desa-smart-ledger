import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ClipboardCheck, Truck, Package, BookOpen, FileText, Receipt, Wallet, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_app/unit/dagang")({ component: UnitDagangPage });

function UnitDagangPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unit Dagang</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Modul khusus untuk unit perdagangan. Semua fitur dagang tersedia di sini secara terstruktur.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Penjualan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Catat penjualan barang dagang dengan jurnal otomatis untuk Penjualan dan HPP.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/penjualan">
              <Button size="sm">Buka Penjualan</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Purchase Order</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola pembelian barang dagang dan buat PO sebelum proses penerimaan.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/purchase-orders">
              <Button size="sm">Buka Purchase Order</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Truck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Supplier</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola daftar pemasok untuk kebutuhan pembelian dan persediaan dagang.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/suppliers">
              <Button size="sm">Buka Supplier</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Penerimaan Barang</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Proses penerimaan barang dagang dari PO dan otomatis buat jurnal BAST.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/purchase-orders">
              <Button size="sm">Pilih PO untuk Terima</Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Buku Besar</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Lihat buku besar yang otomatis terfilter berdasarkan unit dagang aktif.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/buku-besar">
              <Button size="sm">Buka Buku Besar</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Laporan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Laporan keuangan unit dagang dengan filter unit otomatis.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/laporan">
              <Button size="sm">Buka Laporan</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <RotateCcw className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Jurnal Koreksi</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Perbaiki jurnal yang sudah diposting untuk unit dagang aktif.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/jurnal/koreksi">
              <Button size="sm">Buka Jurnal Koreksi</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Piutang</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola akun piutang unit dagang tanpa menyentuh unit lain.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/piutang">
              <Button size="sm">Buka Piutang</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Utang</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola hutang supplier dan kewajiban unit dagang.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/utang">
              <Button size="sm">Buka Utang</Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-5 border">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Catatan</h2>
          <p className="text-sm text-muted-foreground">
            Unit Dagang adalah pintu masuk terpusat untuk fitur perdagangan. Semua menu global dagang sekarang terakses dari halaman ini.
          </p>
        </div>
      </Card>
    </div>
  );
}
