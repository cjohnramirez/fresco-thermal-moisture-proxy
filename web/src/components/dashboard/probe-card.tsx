import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { formatNumber } from "@/components/dashboard/format"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { CHANNELS, type NormalizedReading } from "@/lib/experiment/types"

export function ProbeCard({
  channel,
  reading,
}: {
  channel: (typeof CHANNELS)[number]
  reading: NormalizedReading | undefined
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>{channel.label}</CardTitle>
            <CardDescription>GPIO {channel.pin}</CardDescription>
          </div>
          <StatusBadge status={reading?.status ?? "waiting"} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="text-4xl font-semibold tabular-nums">
          {formatNumber(reading?.celsius)}
          <span className="ml-1 text-base text-muted-foreground">C</span>
        </div>
        <Progress value={reading?.status === "ok" ? 100 : 10}>
          <ProgressLabel>Device count</ProgressLabel>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {reading?.devices ?? 0}
          </span>
        </Progress>
      </CardContent>
    </Card>
  )
}
