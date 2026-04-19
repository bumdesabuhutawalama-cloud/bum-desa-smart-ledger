import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
export const Route = createFileRoute("/_app/piutang")({ component: () => (
  <div className="space-y-3"><h1 className="text-2xl font-bold">Piutang</h1>
    <Card className="p-6 text-sm text-muted-foreground">Klasifikasi (lancar/kurang lancar/diragukan/macet) + penyisihan otomatis menyusul.</Card></div>
) });
