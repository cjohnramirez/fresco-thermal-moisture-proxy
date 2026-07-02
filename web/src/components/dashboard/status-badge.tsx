import { Badge } from "@/components/ui/badge"

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ok"
      ? "default"
      : status === "waiting" || status === "boot" || status === "partial"
        ? "secondary"
        : "destructive"

  return <Badge variant={variant}>{status}</Badge>
}
