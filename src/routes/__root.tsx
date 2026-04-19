import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import appCss from "../styles.css?url";

interface RouterCtx { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterCtx>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SI Laporan Keuangan BUM Desa" },
      { name: "description", content: "Sistem Informasi Laporan Keuangan BUM Desa berbasis Kepmendesa 136/2022 — pencatatan jurnal, buku besar, dan laporan keuangan otomatis." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Halaman tidak ditemukan</p>
        <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Kembali</Link>
      </div>
    </div>
  );
}
