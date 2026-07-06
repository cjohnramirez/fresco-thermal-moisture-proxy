"use client"

import * as React from "react"

import { computeWateringStatus } from "@/lib/experiment/irrigation"
import type { IrrigationEvent } from "@/lib/experiment/types"

export function useWateringStatus(irrigationEvents: IrrigationEvent[]) {
  const [now, setNow] = React.useState(() => Date.now())
  const hasOpenWeighTimer = React.useMemo(
    () =>
      irrigationEvents.some(
        (event) =>
          event.archivedAt === null && Date.parse(event.cutoffAt) > now
      ),
    [irrigationEvents, now]
  )

  // Tick only while a same-day weigh schedule is still open.
  React.useEffect(() => {
    if (!hasOpenWeighTimer) {
      return
    }

    const timerId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [hasOpenWeighTimer])

  return React.useMemo(
    () => computeWateringStatus(irrigationEvents, new Date(now)),
    [irrigationEvents, now]
  )
}
