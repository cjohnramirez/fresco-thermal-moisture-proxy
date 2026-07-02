"use client"

import { ChartRangeTabs } from "@/components/dashboard/chart-range-tabs"
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ChartRange } from "@/lib/experiment/types"

export function ChartCardHeader({
  chartRange,
  description,
  onChartRangeChange,
  title,
}: {
  chartRange: ChartRange
  description: string
  onChartRangeChange: (value: ChartRange) => void
  title: string
}) {
  return (
    <CardHeader>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-pretty">{title}</CardTitle>
          <CardDescription className="break-words">
            {description}
          </CardDescription>
        </div>
        <ChartRangeTabs
          value={chartRange}
          onValueChange={onChartRangeChange}
          className="w-full shrink-0 sm:w-auto"
        />
      </div>
    </CardHeader>
  )
}
