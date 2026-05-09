import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/unit/sp")({
  component: SPIndexRedirect,
});

function SPIndexRedirect() {
  return <Navigate to="/unit/sp/dashboard" />;
}
