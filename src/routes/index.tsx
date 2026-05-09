import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RootRedirect,
});

function RootRedirect() {
  return <Navigate to="/auth" />;
}
