import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, BookOpen, Sparkles, FileText, Receipt, Wallet, PlusSquare, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_app/unit/jasa")({ component: UnitJasaPage });

function UnitJasaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unit Jasa</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Modul khusus untuk unit jasa. Semua fitur unit jasa tersedia di satu halaman.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Pendapatan Jasa</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Catat pendapatan atau biaya jasa dengan jurnal khusus unit jasa.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/jurnal/baru">
              <Button size="sm">Buat Jurnal Jasa</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Buku Besar</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Lihat buku besar unit jasa dengan filter unit aktif.
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
                Laporan keuangan unit jasa otomatis terfilter berdasarkan unit.
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
                Perbaiki jurnal yang sudah diposting untuk unit jasa aktif.
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
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Catat Kegiatan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gunakan Catat Kegiatan untuk mencatat layanan dan aktivitas operasional.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/catat-kegiatan">
              <Button size="sm">Buka Catat Kegiatan</Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Piutang</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola piutang unit jasa secara terpisah dari unit lain.
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
                Kelola utang unit jasa sendiri, tanpa mencampur laporan dengan unit lain.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/utang">
              <Button size="sm">Buka Utang</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <PlusSquare className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Unit Usaha</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kembali ke daftar unit usaha atau edit unit jasa saat ini.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/unit-usaha">
              <Button size="sm">Kelola Unit</Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-5 border">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Catatan</h2>
          <p className="text-sm text-muted-foreground">
            Unit Jasa sekarang menjadi hub fitur internal unit, bukan menu global. Semua transaksi unit jasa akan terfilter oleh unit aktif.
          </p>
        </div>
      </Card>
    </div>
  );
}
