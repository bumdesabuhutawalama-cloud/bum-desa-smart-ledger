import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, FileText, ListTree, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { to: "/akun", label: "Akun", icon: ListTree },
  { to: "/jurnal", label: "Jurnal", icon: BookOpen },
  { to: "/laporan", label: "Laporan", icon: FileText },
  { to: "/aset", label: "Aset", icon: Building2 },
];

export function MobileNav() {
  const loc = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
          return (
            <li key={to}>
              <Link to={to} className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-xs",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
