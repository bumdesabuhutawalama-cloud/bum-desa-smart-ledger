// @ts-nocheck
import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { UnitProvider } from "@/lib/unit-context";

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !isSuperAdmin) nav({ to: "/" });
  }, [loading, isSuperAdmin, nav]);
  if (!isSuperAdmin) return null;
  return <>{children}</>;
}

export const Route = createFileRoute("/pusat")({
  component: PusatLayout,
});

function PusatLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const isLoginRoute = location.pathname.endsWith("/login");

  useEffect(() => {
    if (!loading && !user && !isLoginRoute) nav({ to: "/pusat/login" });
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
      <SuperAdminGuard>
        <Outlet />
      </SuperAdminGuard>
    </UnitProvider>
  );
}
