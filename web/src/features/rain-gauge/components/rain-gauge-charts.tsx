import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { rainChartConfig } from "@/features/rain-gauge/lib/chart-config"
import type { CalibrationTrial, RainGaugeSummary } from "@/lib/rain-gauge/types"

export function RainfallChart({ data }: { data: RainGaugeSummary["series"] }) {
  return (
    <ChartContainer config={rainChartConfig} className="h-70 w-full aspect-auto">
      <AreaChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="rainfallMl"
          type="monotone"
          stroke="var(--color-rainfallMl)"
          fill="var(--color-rainfallMl)"
          fillOpacity={0.14}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function RainRateChart({ data }: { data: RainGaugeSummary["series"] }) {
  return (
    <ChartContainer config={rainChartConfig} className="h-70 w-full aspect-auto">
      <LineChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="rateMlPerMin"
          type="monotone"
          stroke="var(--color-rateMlPerMin)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

export function RainTotalsChart({
  data,
  mode,
}: {
  data: Array<{ time?: string; day?: string; rainfallMl: number }>
  mode: "hourly" | "daily"
}) {
  return (
    <ChartContainer config={rainChartConfig} className="h-70 w-full aspect-auto">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={mode === "hourly" ? "time" : "day"}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="rainfallMl"
          fill="var(--color-rainfallMl)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

export function CalibrationVolumeChart({ data }: { data: CalibrationTrial[] }) {
  return (
    <ChartContainer config={rainChartConfig} className="h-70 w-full aspect-auto">
      <LineChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="sourceRow" tickLine={false} axisLine={false} minTickGap={18} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="bucket1VolumeMl"
          type="monotone"
          stroke="var(--color-bucket1VolumeMl)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="bucket2VolumeMl"
          type="monotone"
          stroke="var(--color-bucket2VolumeMl)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="pairAverageMl"
          type="monotone"
          stroke="var(--color-pairAverageMl)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
