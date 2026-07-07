"use client"

import * as React from "react"

import { computeNextWatering } from "@/lib/experiment/irrigation"
import type { IrrigationEvent, NextWatering } from "@/lib/experiment/types"

import { useNow } from "./use-now"

// Live "Next Watering" view model. Returns null until mounted (see useNow) so the
// server and hydration renders match; then it recomputes every second.
export function useNextWatering(
  events: IrrigationEvent[]
): NextWatering | null {
  const now = useNow(1000)

  return React.useMemo(
    () => (now === null ? null : computeNextWatering(events, new Date(now))),
    [events, now]
  )
}
