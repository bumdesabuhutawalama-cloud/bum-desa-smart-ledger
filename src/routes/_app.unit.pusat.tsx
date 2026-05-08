import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, ArrowRightLeft, Wallet, TrendingUp, FileText, Receipt } from "lucide-react";

export const Route = createFileRoute("/_app/unit/pusat")({ component: UnitPusatPage });

function UnitPusatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unit Pusat</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Modul khusus untuk Unit Pusat. Menerima penyertaan modal dan mendistribusikan ke unit-unit usaha lainnya.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 border">
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Penyertaan Modal</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Terima penyertaan modal dari luar dan catat sebagai ekuitas.
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
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Distribusi Modal</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Distribusikan modal ke unit-unit usaha melalui transfer antar pusat.
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
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Laporan Keuangan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Lihat laporan keuangan konsolidasi dan spesifik unit pusat.
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
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Jurnal Umum</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola jurnal umum dan koreksi untuk unit pusat.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/jurnal">
              <Button size="sm">Buka Jurnal</Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-5 border">
        <div className="flex items-start gap-3">
          <Store className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Fungsi Unit Pusat</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Unit Pusat berperan sebagai pusat pengelolaan modal BUMDesa. Modal yang diterima melalui penyertaan
              akan didistribusikan ke unit-unit usaha lainnya untuk mendukung operasional dan pengembangan usaha.
              Semua transaksi tercatat secara akurat sesuai prinsip akuntansi yang berlaku.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}