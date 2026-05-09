import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dagang/")({
  component: DagangRedirect,
});

function DagangRedirect() {
  return <Navigate to="/dagang/login" />;
}