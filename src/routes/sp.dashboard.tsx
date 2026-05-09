import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUnit } from "@/lib/unit-context";
import { useNavigate } from "@tanstack/react-router";
import { UnitLayout } from "@/shared/layouts/UnitLayout";
import { StatCard, ModuleCard } from "@/shared/components/DashboardCards";
import { PiggyBank, TrendingUp, BarChart3, Wallet, ArrowRightLeft, FileText, Package, Receipt, Users } from "lucide-react";

export const Route = createFileRoute("/sp/dashboard")({
  component: SPDashboard,
});

function SPDashboard() {
  const { currentUnitKode, setCurrentUnitKode, isConsolidating } = useUnit();
  const navigate = useNavigate();

  // Auto set unit ke SP saat masuk dashboard
  useEffect(() => {
    if (currentUnitKode !== "SP" && !isConsolidating) {
      setCurrentUnitKode("SP");
    }
  }, [currentUnitKode, setCurrentUnitKode, isConsolidating]);

  return (
    <UnitLayout
      title="Dashboard Unit Simpan Pinjam"
      description="Kelola layanan simpanan dan pinjaman masyarakat BUM Desa"
      unitKode="SP"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={PiggyBank}
          label="Dana Simpanan"
          value="45,250,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Wallet}
          label="Dana Pinjaman"
          value="38,750,000"
          unit="IDR"
          variant="default"
        />
        <StatCard
          icon={TrendingUp}
          label="Pendapatan Bunga"
          value="2,850,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Users}
          label="Anggota Aktif"
          value="156"
          description="Nasabah aktif"
          variant="default"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Kelola Pinjaman"
          description="Cek status, cicilan, dan piutang bunga"
          icon={<Wallet className="h-5 w-5" />}
          href="/sp/pinjaman"
          onClick={() => navigate({ to: "/sp/pinjaman" })}
        />
        <ModuleCard
          title="Kelola Simpanan"
          description="Lihat rekening simpanan anggota"
          icon={<PiggyBank className="h-5 w-5" />}
          href="/sp/simpanan"
          onClick={() => navigate({ to: "/sp/simpanan" })}
        />
        <ModuleCard
          title="Transaksi Harian"
          description="Catat setoran, penarikan, dan pembayaran"
          icon={<Receipt className="h-5 w-5" />}
          href="/sp/transaksi"
          onClick={() => navigate({ to: "/sp/transaksi" })}
        />
        <ModuleCard
          title="Kas & Bank"
          description="Kelola transaksi kas dan bank unit"
          icon={<Wallet className="h-5 w-5" />}
          href="/sp/kas-bank"
          onClick={() => navigate({ to: "/sp/kas-bank" })}
        />
        <ModuleCard
          title="Jurnal"
          description="Kelola jurnal dan posting transaksi"
          icon={<FileText className="h-5 w-5" />}
          href="/sp/jurnal"
          onClick={() => navigate({ to: "/sp/jurnal" })}
        />
        <ModuleCard
          title="Laporan"
          description="Lihat laporan keuangan dan nasabah"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/sp/laporan"
          onClick={() => navigate({ to: "/sp/laporan" })}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Fitur Unit Simpan Pinjam</h3>
          <ul className="text-sm text-orange-800 space-y-1">
            <li>• Manajemen rekening simpanan</li>
            <li>• Pengelolaan pinjaman dan cicilan</li>
            <li>• Perhitungan bunga otomatis</li>
            <li>• Pelaporan keuangan mikro</li>
            <li>• Sistem angsuran terjadwal</li>
          </ul>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Aktivitas Hari Ini</h3>
          <div className="space-y-2 text-sm text-red-800">
            <p>• 12 setoran simpanan baru</p>
            <p>• 8 pembayaran cicilan pinjaman</p>
            <p>• 3 pengajuan pinjaman pending</p>
            <p>• Laporan harian siap untuk review</p>
          </div>
        </div>
      </div>
    </UnitLayout>
  );
}