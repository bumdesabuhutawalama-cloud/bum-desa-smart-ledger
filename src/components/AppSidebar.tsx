import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListTree,
  LogOut,
  Store,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useUnit } from "@/lib/unit-context";
import { UNIT_MODULES } from "@/lib/unit-modules";
import { cn } from "@/lib/utils";
import { useState } from "react";

const globalItems = [
  { to: "/dashboard", label: "Dashboard Utama", icon: LayoutDashboard },
  { to: "/data-master", label: "Data Master", icon: ListTree },
  { to: "/unit-usaha", label: "Daftar Unit Usaha", icon: Store },
  { to: "/unit/pusat", label: "Unit Pusat", icon: Store },
] as const;

export function AppSidebar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, roles, signOut } = useAuth();
  const { units, currentUnitKode, setCurrentUnitKode } = useUnit();
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(["DAGANG", "JASA", "PANGAN", "SP"]));

  const toggleUnit = (unitKode: string) => {
    const newSet = new Set(expandedUnits);
    if (newSet.has(unitKode)) {
      newSet.delete(unitKode);
    } else {
      newSet.add(unitKode);
    }
    setExpandedUnits(newSet);
  };

  const isPathActive = (path: string): boolean => {
    return loc.pathname === path || (path !== "/dashboard" && loc.pathname.startsWith(path));
  };

  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* Header */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold">
            BD
          </div>
          <div>
            <div className="font-semibold leading-tight">BUM Desa</div>
            <div className="text-xs text-sidebar-foreground/70">Smart Ledger ERP</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {/* Global Items */}
        {globalItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isPathActive(to)
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        {/* Unit Separator */}
        <div className="my-4 px-3">
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Unit Operasional
          </div>
        </div>

        {/* Unit Items */}
        {units
          .filter((u) => u.is_active && ["PANGAN", "DAGANG", "JASA", "SP"].includes(u.kode))
          .map((unit) => {
            const module = UNIT_MODULES[unit.kode as any];
            const isExpanded = expandedUnits.has(unit.kode);
            const isSelected = currentUnitKode === unit.kode;

            return (
              <div key={unit.id}>
                {/* Unit Header */}
                <div
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
                    isSelected
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => setCurrentUnitKode(unit.kode)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {module && <module.icon className="h-4 w-4" />}
                    <span>{unit.nama}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleUnit(unit.kode);
                    }}
                    className="p-1 hover:bg-sidebar-accent rounded-md"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </div>

                {/* Unit Submenu */}
                {isExpanded && module && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-sidebar-accent">
                    {module.subMenus.slice(0, 3).map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-xs transition-colors pl-4",
                          isPathActive(item.href)
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        {item.icon && <item.icon className="h-3.5 w-3.5" />}
                        {item.label}
                      </Link>
                    ))}
                    {module.subMenus.length > 3 && (
                      <button
                        onClick={() => nav({ to: module.subMenus[0].href.split("/").slice(0, -1).join("/") })}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground pl-4 w-full"
                      >
                        <MoreVertical className="h-3 w-3" />
                        <span>Lihat semua ({module.subMenus.length})</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 py-2 text-xs">
          <div className="font-medium truncate">{user?.email}</div>
          <div className="text-sidebar-foreground/70 capitalize text-xs">{roles.join(", ") || "-"}</div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            nav({ to: "/auth" });
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" /> Keluar
        </button>
      </div>
    </aside>
  );
}
