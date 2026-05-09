// @ts-nocheck
import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { UnitProvider } from "@/lib/unit-context";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { UnitSelector } from "@/components/UnitSelector";
import { useUnitAccessGuard } from "@/lib/use-unit-access-guard";

function GuardedOutlet({ kode }: { kode: "DAGANG" | "JASA" | "PANGAN" | "SP" }) {
  useUnitAccessGuard(kode);
  return <Outlet />;
}

export const Route = createFileRoute("/sp")({
  component: SPLayout,
});

function SPLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const isLoginRoute = location.pathname.endsWith("/login");

  useEffect(() => {
    if (!loading && !user && !isLoginRoute) nav({ to: "/sp/login" });
  }, [loading, user, nav, isLoginRoute]);

  if (isLoginRoute) {
    return (
      <UnitProvider>
        <Outlet />
      </UnitProvider>
    );
  }

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat…</div>;
  }

  return (
    <UnitProvider>
      <div className="min-h-screen flex bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
          <header className="sticky top-0 z-40 flex items-center justify-end gap-3 border-b bg-background/95 backdrop-blur px-4 md:px-8 h-14">
            <UnitSelector />
          </header>
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <GuardedOutlet kode="SP" />
          </div>
        </main>
        <MobileNav />
      </div>
    </UnitProvider>
  );
}
