import { ClockIcon, DropletsIcon, ScaleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatManilaDateTime } from "@/lib/experiment/irrigation"
import type { WateringStatus } from "@/lib/experiment/types"

function minutesLabel(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function WateringStatusCard({
  onLogWatering,
  onLogWeight,
  status,
}: {
  onLogWatering: () => void
  onLogWeight: () => void
  status: WateringStatus
}) {
  const title =
    status.state === "idle"
      ? "No Open Watering"
      : status.state === "counting"
        ? "Weigh Timer Running"
        : status.state === "due"
          ? "Weigh The Bag Now"
          : "Weigh Window Overdue"
  const detail =
    status.state === "idle"
      ? "Log the next watering to start the +1 h clock."
      : status.state === "counting"
        ? `${minutesLabel(status.remainingMs)} remaining until +1 h weigh.`
        : status.state === "due"
          ? "The +1 h mark has arrived."
          : `${minutesLabel(status.overdueMs)} past the +1 h mark.`
  const progress =
    status.state === "idle"
      ? 0
      : Math.min(
          100,
          Math.round(
            ((60 * 60_000 - status.remainingMs) / (60 * 60_000)) * 100
          )
        )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardDescription>Watering Status</CardDescription>
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          {status.state === "idle" ? (
            <DropletsIcon aria-hidden="true" className="text-muted-foreground" />
          ) : status.state === "counting" ? (
            <ClockIcon aria-hidden="true" className="text-muted-foreground" />
          ) : (
            <ScaleIcon aria-hidden="true" className="text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{detail}</p>
        {status.state !== "idle" && (
          <div className="flex flex-col gap-2">
            <Progress value={progress} />
            <div className="text-xs text-muted-foreground">
              Due {formatManilaDateTime(status.dueAt)}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onLogWatering}
            disabled={status.state !== "idle"}
          >
            <DropletsIcon data-icon="inline-start" />
            Log Watering
          </Button>
          {status.state !== "idle" && (
            <Button type="button" variant="outline" onClick={onLogWeight}>
              <ScaleIcon data-icon="inline-start" />
              Log Weight
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
