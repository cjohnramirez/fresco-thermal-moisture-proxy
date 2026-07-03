import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/features/dashboard/lib/format"
import { StatusBadge } from "@/features/dashboard/components/status-badge"
import { CHANNELS, type NormalizedReading } from "@/lib/experiment/types"

export function ProbeCard({
  channel,
  loading = false,
  reading,
}: {
  channel: (typeof CHANNELS)[number]
  loading?: boolean
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
          {loading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <StatusBadge status={reading?.status ?? "waiting"} />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="text-4xl font-semibold tabular-nums">
          {loading ? (
            <Skeleton className="h-11 w-28" />
          ) : (
            <>
              {formatNumber(reading?.celsius)}
              <span className="ml-1 text-base text-muted-foreground">C</span>
            </>
          )}
        </div>
        <Progress value={reading?.status === "ok" ? 100 : 10}>
          <ProgressLabel>Device count</ProgressLabel>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {loading ? <Skeleton className="h-4 w-6" /> : (reading?.devices ?? 0)}
          </span>
        </Progress>
      </CardContent>
    </Card>
  )
}
