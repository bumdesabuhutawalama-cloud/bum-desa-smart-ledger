import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  description,
  variant = "default",
}: StatCardProps) {
  const bgClass = {
    default: "bg-blue-50",
    success: "bg-green-50",
    warning: "bg-orange-50",
    destructive: "bg-red-50",
  }[variant];

  const borderClass = {
    default: "border-blue-200",
    success: "border-green-200",
    warning: "border-orange-200",
    destructive: "border-red-200",
  }[variant];

  const iconColorClass = {
    default: "text-blue-600",
    success: "text-green-600",
    warning: "text-orange-600",
    destructive: "text-red-600",
  }[variant];

  return (
    <Card className={`p-6 border-2 ${borderClass} ${bgClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-2 flex items-baseline gap-2">
            {value}
            {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        <Icon className={`h-8 w-8 ${iconColorClass}`} />
      </div>
    </Card>
  );
}

interface ModuleCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  onClick?: () => void;
}

export function ModuleCard({ title, description, icon, href, onClick }: ModuleCardProps) {
  return (
    <Card className="p-5 border hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className="text-primary">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-md text-center">{description}</p>
      {action}
    </div>
  );
}
