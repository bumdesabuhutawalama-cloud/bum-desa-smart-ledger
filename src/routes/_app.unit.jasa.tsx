import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/unit/jasa")({
  component: JasaIndexRedirect,
});

function JasaIndexRedirect() {
  return <Navigate to="/unit/jasa/dashboard" />;
}
