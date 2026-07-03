"use client"

import { ChartRangeTabs } from "@/features/dashboard/components/chart-range-tabs"
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { ChartRange } from "@/lib/experiment/types"

export function ChartCardHeader({
  chartRange,
  description,
  loading = false,
  onChartRangeChange,
  title,
}: {
  chartRange: ChartRange
  description: string
  loading?: boolean
  onChartRangeChange: (value: ChartRange) => void
  title: string
}) {
  return (
    <CardHeader>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-pretty">{title}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 wrap-break-word">
            {loading && <Spinner />}
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
