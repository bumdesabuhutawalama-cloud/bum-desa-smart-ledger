import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
export const Route = createFileRoute("/_app/aset")({ component: () => (
  <div className="space-y-3"><h1 className="text-2xl font-bold">Aset Tetap</h1>
    <Card className="p-6 text-sm text-muted-foreground">Modul aset + penyusutan garis lurus dan auto-jurnal akan dibangun berikutnya.</Card></div>
) });
