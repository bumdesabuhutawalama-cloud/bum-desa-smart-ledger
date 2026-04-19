import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
export const Route = createFileRoute("/_app/laporan")({ component: () => (
  <div className="space-y-3"><h1 className="text-2xl font-bold">Laporan Keuangan</h1>
    <Card className="p-6 text-sm text-muted-foreground">Neraca, Laba Rugi, Arus Kas, Perubahan Ekuitas, dan Catatan akan dibangun di iterasi berikutnya — dihitung otomatis dari jurnal.</Card></div>
) });
