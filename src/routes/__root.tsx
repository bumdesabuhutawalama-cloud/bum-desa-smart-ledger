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
      { title: "SILAPOR-BERCAHAYA" },
      { name: "description", content: "Sistem Informasi Laporan Keuangan BUM Desa berbasis Kepmendesa 136/2022 — pencatatan jurnal, buku besar, dan laporan keuangan otomatis." },
      { property: "og:title", content: "SILAPOR-BERCAHAYA" },
      { name: "twitter:title", content: "SILAPOR-BERCAHAYA" },
      { property: "og:description", content: "Sistem Informasi Laporan Keuangan BUM Desa berbasis Kepmendesa 136/2022 — pencatatan jurnal, buku besar, dan laporan keuangan otomatis." },
      { name: "twitter:description", content: "Sistem Informasi Laporan Keuangan BUM Desa berbasis Kepmendesa 136/2022 — pencatatan jurnal, buku besar, dan laporan keuangan otomatis." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eeb993cf-1cc1-4ef0-be15-49a1a6c43d15/id-preview-1bfa669a--05e7cca0-88ab-44b6-9cc7-13382b706ce2.lovable.app-1776664885280.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eeb993cf-1cc1-4ef0-be15-49a1a6c43d15/id-preview-1bfa669a--05e7cca0-88ab-44b6-9cc7-13382b706ce2.lovable.app-1776664885280.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
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
