"use client"

import * as React from "react"

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { CHART_RANGES, isChartRange } from "@/lib/experiment/irrigation"
import type { ChartRange } from "@/lib/experiment/types"

const CHART_RANGE_LABELS: Record<ChartRange, string> = {
  "1h": "1 Hour",
  "1d": "1 Day",
  "1w": "1 Week",
}

export function ChartRangeTabs({
  className,
  onValueChange,
  value,
}: {
  className?: string
  onValueChange: (value: ChartRange) => void
  value: ChartRange
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => {
        if (isChartRange(nextValue)) {
          onValueChange(nextValue)
        }
      }}
      className={className}
    >
      <TabsList aria-label="Chart Range" className="grid h-9 w-full grid-cols-3 sm:w-auto">
        {CHART_RANGES.map((range) => (
          <TabsTrigger key={range} value={range} className="px-2.5">
            {CHART_RANGE_LABELS[range]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
