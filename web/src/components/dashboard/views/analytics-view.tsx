"use client"

import * as React from "react"
import {
  ClockIcon,
  DatabaseIcon,
  DropletsIcon,
  ScaleIcon,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { ChartCardHeader } from "@/components/dashboard/chart-card-header"
import { chartConfig } from "@/components/dashboard/dashboard-config"
import { MetricCard } from "@/components/dashboard/metric-card"
import { TemperatureChart } from "@/components/dashboard/temperature-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  baselineVerdictLabel,
  formatManilaDateTime,
} from "@/lib/experiment/irrigation"
import type {
  ChartRange,
  ExperimentSummary,
  WeekAnalysisResult,
} from "@/lib/experiment/types"
import type { CloudState } from "@/components/dashboard/dashboard-types"

function average(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function kg(value: number | null) {
  return value === null ? "--" : `${value.toFixed(2)} kg`
}

function slope(value: number | null) {
  return value === null ? "--" : `${value.toFixed(3)} kg/day`
}

export function AnalyticsView({
  chartRange,
  onChartRangeChange,
  runWeekAnalysis,
  setWeekRange,
  summary,
  weekAnalysis,
  weekAnalysisState,
  weekRange,
}: {
  chartRange: ChartRange
  onChartRangeChange: (value: ChartRange) => void
  runWeekAnalysis: () => void
  setWeekRange: React.Dispatch<
    React.SetStateAction<{ from: string; to: string }>
  >
  summary: ExperimentSummary | null
  weekAnalysis: WeekAnalysisResult | null
  weekAnalysisState: CloudState
  weekRange: { from: string; to: string }
}) {
  const averageDailyUse = average(
    summary?.dailyWaterUse.map((row) => row.waterUseKg) ?? []
  )
  const baseline = summary?.baseline
  const parsedAt = weekAnalysis?.generatedAt
    ? formatManilaDateTime(weekAnalysis.generatedAt)
    : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <MetricCard
          label="Baseline Drift"
          value={slope(baseline?.slopeKgPerDay ?? null)}
          detail={baseline ? baselineVerdictLabel(baseline.verdict) : "Need drained weights"}
          icon={ScaleIcon}
        />
        <MetricCard
          label="Average Daily Water Use"
          value={kg(averageDailyUse)}
          detail={`${summary?.dailyWaterUse.length ?? 0} usable day gaps`}
          icon={DropletsIcon}
        />
        <MetricCard
          label="Watering Recovery Windows"
          value={String(summary?.wateringRecovery.length ?? 0)}
          detail="Root-zone samples within 2 h after watering"
          icon={ClockIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Full Week Parse</CardTitle>
          <CardDescription>
            Chart tabs stay bucketed for speed; full-week parsing is explicit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <FieldGroup className="flex flex-col gap-2 lg:flex-row lg:gap-4">
              <Field>
                <FieldLabel htmlFor="week-from">From</FieldLabel>
                <Input
                  id="week-from"
                  type="datetime-local"
                  value={weekRange.from}
                  onChange={(event) =>
                    setWeekRange((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                  autoComplete="off"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="week-to">To</FieldLabel>
                <Input
                  id="week-to"
                  type="datetime-local"
                  value={weekRange.to}
                  onChange={(event) =>
                    setWeekRange((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                  autoComplete="off"
                />
              </Field>
            </FieldGroup>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <Button
                type="button"
                onClick={runWeekAnalysis}
                disabled={weekAnalysisState.status === "loading"}
              >
                <DatabaseIcon data-icon="inline-start" />
                {weekAnalysisState.status === "loading"
                  ? "Parsing Full Week"
                  : "Parse Full Week"}
              </Button>
              {weekAnalysis && (
                <Badge variant="secondary">Full-Resolution Metrics</Badge>
              )}
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {weekAnalysisState.message}
            {parsedAt ? ` at ${parsedAt}` : ""}
            {weekAnalysis ? `; ${weekAnalysis.rowCount} rows parsed.` : ""}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <ChartCardHeader
            title="Temperature + Irrigation"
            description="Bucketed probe temperatures with watering markers."
            chartRange={chartRange}
            onChartRangeChange={onChartRangeChange}
          />
          <CardContent>
            <TemperatureChart
              data={summary?.temperatureSeries ?? []}
              markers={summary?.irrigationMarkers ?? []}
            />
          </CardContent>
        </Card>

        <Card>
          <ChartCardHeader
            title="Baseline Drift"
            description="Pre-water and +1 h drained mass per day."
            chartRange={chartRange}
            onChartRangeChange={onChartRangeChange}
          />
          <CardContent>
            <ChartContainer config={chartConfig} className="h-70 w-full aspect-auto">
              <LineChart data={summary?.baseline.points ?? []} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="drainedMassKg"
                  type="monotone"
                  stroke="var(--color-drainedMassKg)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="preMassKg"
                  type="monotone"
                  stroke="var(--color-preMassKg)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <ChartCardHeader
            title="Daily Water Use"
            description="Drained baseline minus next pre-water low point."
            chartRange={chartRange}
            onChartRangeChange={onChartRangeChange}
          />
          <CardContent>
            <ChartContainer config={chartConfig} className="h-65 w-full aspect-auto">
              <BarChart data={summary?.dailyWaterUse ?? []} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="waterUseKg" fill="var(--color-waterUseKg)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <ChartCardHeader
            title="First-Hour Drainage"
            description="Post-water mass minus +1 h drained mass."
            chartRange={chartRange}
            onChartRangeChange={onChartRangeChange}
          />
          <CardContent>
            <ChartContainer config={chartConfig} className="h-65 w-full aspect-auto">
              <BarChart data={summary?.firstHourDrainage ?? []} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Bar dataKey="drainageKg" fill="var(--color-drainageKg)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <ChartCardHeader
            title="Root Temperature Swing"
            description="Daily max minus min for the root-zone probe."
            chartRange={chartRange}
            onChartRangeChange={onChartRangeChange}
          />
          <CardContent>
            <ChartContainer config={chartConfig} className="h-65 w-full aspect-auto">
              <BarChart data={summary?.swingData ?? []} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="swing" fill="var(--color-swing)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <ChartCardHeader
            title="Watering Recovery Windows"
            description="Root-zone temperature change within 2 h after watering."
            chartRange={chartRange}
            onChartRangeChange={onChartRangeChange}
          />
          <CardContent>
            <ChartContainer config={chartConfig} className="h-65 w-full aspect-auto">
              <BarChart data={summary?.wateringRecovery ?? []} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="event" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Bar dataKey="delta" fill="var(--chart-4)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
