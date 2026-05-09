import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/unit/perdagangan")({
  component: PerdaganganIndexRedirect,
});

function PerdaganganIndexRedirect() {
  return <Navigate to="/unit/perdagangan/dashboard" />;
}
