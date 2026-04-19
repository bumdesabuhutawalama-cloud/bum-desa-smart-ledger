import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
export const Route = createFileRoute("/_app/buku-besar")({ component: () => <Stub title="Buku Besar" /> });
function Stub({ title }: { title: string }) {
  return (<div className="space-y-3"><h1 className="text-2xl font-bold">{title}</h1>
    <Card className="p-6 text-sm text-muted-foreground">Modul ini akan dibangun di iterasi berikutnya. Data jurnal sudah tersimpan dan siap diolah.</Card></div>);
}
