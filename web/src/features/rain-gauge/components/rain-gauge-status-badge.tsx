import { Badge } from "@/components/ui/badge"
import type { RainGaugeConnectionState } from "@/lib/rain-gauge/types"

const LABELS: Record<RainGaugeConnectionState, string> = {
  idle: "Idle",
  connecting: "Connecting...",
  connected: "Connected",
  reconnecting: "Reconnecting...",
  error: "Error",
}

export function RainGaugeStatusBadge({
  state,
}: {
  state: RainGaugeConnectionState
}) {
  return (
    <Badge variant={state === "connected" ? "default" : "secondary"}>
      {LABELS[state]}
    </Badge>
  )
}
