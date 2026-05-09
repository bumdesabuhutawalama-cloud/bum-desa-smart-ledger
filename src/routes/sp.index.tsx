import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/sp/")({
  component: SPRedirect,
});

function SPRedirect() {
  return <Navigate to="/sp/login" />;
}