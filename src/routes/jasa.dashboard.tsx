// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUnit } from "@/lib/unit-context";
import { useNavigate } from "@tanstack/react-router";
import { UnitLayout } from "@/shared/layouts/UnitLayout";
import { StatCard, ModuleCard } from "@/shared/components/DashboardCards";
import { Briefcase, TrendingUp, BarChart3, Wallet, ArrowRightLeft, FileText, Package, Receipt, Users } from "lucide-react";

export const Route = createFileRoute("/jasa/dashboard")({
  component: JasaDashboard,
});

function JasaDashboard() {
  const { currentUnitKode, setCurrentUnitKode, isConsolidating } = useUnit();
  const navigate = useNavigate();

  // Auto set unit ke JASA saat masuk dashboard
  useEffect(() => {
    if (currentUnitKode !== "JASA" && !isConsolidating) {
      setCurrentUnitKode("JASA");
    }
  }, [currentUnitKode, setCurrentUnitKode, isConsolidating]);

  return (
    <UnitLayout
      title="Dashboard Unit Jasa"
      description="Kelola layanan jasa dan sewa alat/gedung BUM Desa"
      unitKode="JASA"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Pendapatan Jasa"
          value="3,250,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Wallet}
          label="Kas Unit"
          value="1,750,000"
          unit="IDR"
          variant="default"
        />
        <StatCard
          icon={Package}
          label="Kontrak Aktif"
          value="12"
          description="Proyek berjalan"
          variant="default"
        />
        <StatCard
          icon={Users}
          label="Klien Aktif"
          value="28"
          description="Bulan ini"
          variant="default"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Penjualan Jasa"
          description="Catat penjualan layanan dan kontrak"
          icon={<Receipt className="h-5 w-5" />}
          href="/jasa/penjualan"
          onClick={() => navigate({ to: "/jasa/penjualan" })}
        />
        <ModuleCard
          title="Biaya Operasional"
          description="Catat biaya operasional dan maintenance"
          icon={<Briefcase className="h-5 w-5" />}
          href="/jasa/biaya"
          onClick={() => navigate({ to: "/jasa/biaya" })}
        />
        <ModuleCard
          title="Manajemen Kontrak"
          description="Kelola kontrak dan perjanjian jasa"
          icon={<Package className="h-5 w-5" />}
          href="/jasa/kontrak"
          onClick={() => navigate({ to: "/jasa/kontrak" })}
        />
        <ModuleCard
          title="Kas & Bank"
          description="Kelola transaksi kas dan bank unit"
          icon={<Wallet className="h-5 w-5" />}
          href="/jasa/kas-bank"
          onClick={() => navigate({ to: "/jasa/kas-bank" })}
        />
        <ModuleCard
          title="Jurnal"
          description="Kelola jurnal dan posting transaksi"
          icon={<FileText className="h-5 w-5" />}
          href="/jasa/jurnal"
          onClick={() => navigate({ to: "/jasa/jurnal" })}
        />
        <ModuleCard
          title="Laporan"
          description="Lihat laporan jasa dan keuangan"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/jasa/laporan"
          onClick={() => navigate({ to: "/jasa/laporan" })}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Fitur Unit Jasa</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Manajemen kontrak dan perjanjian</li>
            <li>• Penagihan dan invoice otomatis</li>
            <li>• Pelacakan progress proyek</li>
            <li>• Laporan pendapatan jasa</li>
            <li>• Integrasi dengan sistem billing</li>
          </ul>
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-pink-900 mb-2">Aktivitas Hari Ini</h3>
          <div className="space-y-2 text-sm text-pink-800">
            <p>• 5 kontrak baru ditandatangani</p>
            <p>• 3 invoice telah dikirim ke klien</p>
            <p>• 2 proyek selesai bulan ini</p>
            <p>• Laporan bulanan siap untuk review</p>
          </div>
        </div>
      </div>
    </UnitLayout>
  );
}