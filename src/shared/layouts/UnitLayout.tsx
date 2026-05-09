import { ReactNode } from "react";
import { useUnit } from "@/lib/unit-context";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface UnitLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  unitKode: string;
}

export function UnitLayout({ children, title, description, unitKode }: UnitLayoutProps) {
  const { currentUnitKode, isConsolidating } = useUnit();

  // Peringatan jika context unit berbeda dari route unit
  const isWrongUnit = !isConsolidating && currentUnitKode !== unitKode;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </div>

      {isWrongUnit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unit saat ini ({currentUnitKode}) tidak sesuai dengan unit halaman ({unitKode}). 
            Data yang ditampilkan mungkin tidak akurat.
          </AlertDescription>
        </Alert>
      )}

      <div>{children}</div>
    </div>
  );
}
