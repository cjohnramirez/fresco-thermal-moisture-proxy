import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { chartConfig } from "@/components/dashboard/dashboard-config"
import type { chartSeries } from "@/lib/experiment/analytics"

export function TemperatureChart({
  data,
  markers = [],
}: {
  data: ReturnType<typeof chartSeries>
  markers?: Array<{ time: string; label: string; wateredAt: string }>
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full aspect-auto">
      <AreaChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {markers.map((marker) => (
          <ReferenceLine
            key={marker.wateredAt}
            x={marker.time}
            stroke="var(--border)"
            label={marker.label}
          />
        ))}
        <Area
          dataKey="control"
          type="monotone"
          stroke="var(--color-control)"
          fill="var(--color-control)"
          fillOpacity={0.08}
          strokeWidth={2}
        />
        <Area
          dataKey="surface"
          type="monotone"
          stroke="var(--color-surface)"
          fill="var(--color-surface)"
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          dataKey="roots"
          type="monotone"
          stroke="var(--color-roots)"
          fill="var(--color-roots)"
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          dataKey="bottom"
          type="monotone"
          stroke="var(--color-bottom)"
          fill="var(--color-bottom)"
          fillOpacity={0.08}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
