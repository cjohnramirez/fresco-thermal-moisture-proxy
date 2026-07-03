import { Badge } from "@/components/ui/badge"
import type { CloudState } from "@/features/dashboard/lib/dashboard-types"

export function CloudBadge({ state }: { state: CloudState }) {
  if (state.status === "error") {
    return <Badge variant="destructive">Supabase error</Badge>
  }

  if (state.status === "ready") {
    return <Badge>Supabase ready</Badge>
  }

  return <Badge variant="outline">{state.status}</Badge>
}
