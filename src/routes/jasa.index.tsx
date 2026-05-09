import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/jasa/")({
  component: JasaRedirect,
});

function JasaRedirect() {
  return <Navigate to="/jasa/login" />;
}