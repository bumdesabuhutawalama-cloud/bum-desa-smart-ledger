import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/pangan')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/pangan"!</div>
}
