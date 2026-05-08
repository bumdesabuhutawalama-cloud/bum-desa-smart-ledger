import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListTree, Layers, Store, ArrowRightLeft, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_app/data-master")({ component: DataMasterPage });

function DataMasterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Master</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Kelola master data penting untuk sistem multi-unit: unit usaha, jenis usaha, akun, dan konfigurasi terkait.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Daftar Unit Usaha</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola semua unit usaha BUMDes, termasuk Unit Dagang, Unit Jasa, dan USP Simpan Pinjam.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/unit-usaha">
              <Button size="sm">Kelola Unit Usaha</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Jenis Usaha</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Definisikan tipe unit usaha dan kontrol kategori layanan yang tersedia.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/jenis-usaha">
              <Button size="sm">Kelola Jenis Usaha</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <ListTree className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Bagan Akun</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Atur daftar akun untuk akuntansi unit dan pastikan semua transaksi terhubung dengan benar.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/akun">
              <Button size="sm">Kelola Akun</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Transfer Antar Unit</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Akses kembali fungsi transfer antar unit untuk memindahkan saldo antar unit usaha.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/transfer">
              <Button size="sm">Buka Transfer</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <RotateCcw className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Jurnal Koreksi</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Akses kembali halaman koreksi jurnal untuk memperbaiki pencatatan pusat.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/jurnal/koreksi">
              <Button size="sm">Buka Jurnal Koreksi</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
