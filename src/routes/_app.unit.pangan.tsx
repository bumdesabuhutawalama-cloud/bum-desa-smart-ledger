import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/unit/pangan")({
  component: PanganIndexRedirect,
});

function PanganIndexRedirect() {
  return <Navigate to="/unit/pangan/dashboard" />;
}
