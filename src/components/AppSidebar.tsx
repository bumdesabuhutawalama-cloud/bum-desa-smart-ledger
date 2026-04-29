import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpen,
  ListTree,
  FileText,
  ClipboardList,
  Wallet,
  Receipt,
  Package,
  LogOut,
  Building2,
  PlusSquare,
  ScrollText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/akun", label: "Bagan Akun", icon: ListTree },
  { to: "/jurnal", label: "Jurnal Umum", icon: BookOpen },
  { to: "/jurnal/baru", label: "Input Jurnal", icon: PlusSquare },
  { to: "/catat-kegiatan", label: "Catat Kegiatan", icon: Sparkles },
  { to: "/jurnal/koreksi", label: "Jurnal Koreksi", icon: RotateCcw },
  { to: "/buku-besar", label: "Buku Besar", icon: ClipboardList },
  { to: "/laporan", label: "Laporan Keuangan", icon: FileText },
  { to: "/lpj", label: "Generate LPJ", icon: ScrollText },
  { to: "/aset", label: "Aset Tetap", icon: Building2 },
  { to: "/piutang", label: "Piutang", icon: Receipt },
  { to: "/utang", label: "Utang", icon: Wallet },
  { to: "/persediaan", label: "Persediaan", icon: Package },
] as const;

export function AppSidebar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, roles, signOut } = useAuth();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold">
            BD
          </div>
          <div>
            <div className="font-semibold leading-tight">BUM Desa</div>
            <div className="text-xs text-sidebar-foreground/70">Sistem Keuangan</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to || (to !== "/dashboard" && loc.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 py-2 text-xs">
          <div className="font-medium truncate">{user?.email}</div>
          <div className="text-sidebar-foreground/70 capitalize">{roles.join(", ") || "-"}</div>
        </div>
        <button
          onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" /> Keluar
        </button>
      </div>
    </aside>
  );
}
