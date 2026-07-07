"use client"

import { DropletsIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useNextWatering } from "@/features/dashboard/hooks/use-next-watering"
import { formatCountdown } from "@/features/dashboard/lib/format"
import { formatManilaClock, formatManilaTime } from "@/lib/experiment/irrigation"
import type { IrrigationEvent } from "@/lib/experiment/types"

export function NextWateringCard({ events }: { events: IrrigationEvent[] }) {
  const nextWatering = useNextWatering(events)

  let countdown = "--:--"
  let detail = "Waiting for the next checkpoint."

  if (nextWatering?.state === "idle") {
    detail = `No open weigh window. Now ${formatManilaClock(nextWatering.nowAt)} Manila.`
  } else if (nextWatering) {
    countdown = formatCountdown(nextWatering.remainingMs)
    detail = `Now ${formatManilaClock(nextWatering.nowAt)} → next ${
      nextWatering.nextAt ? formatManilaTime(nextWatering.nextAt) : "cutoff"
    }`
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>Next Watering</CardDescription>
          <DropletsIcon aria-hidden="true" className="text-muted-foreground" />
        </div>
        <CardTitle className="text-4xl tabular-nums">{countdown}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
