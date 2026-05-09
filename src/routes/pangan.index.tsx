import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/pangan/")({
  component: PanganRedirect,
});

function PanganRedirect() {
  return <Navigate to="/pangan/login" />;
}