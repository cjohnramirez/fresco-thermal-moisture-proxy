import {
  CheckCircle2Icon,
  CloudIcon,
  GaugeIcon,
  ScaleIcon,
  ThermometerIcon,
} from "lucide-react"

import { ChartCardHeader } from "@/features/dashboard/components/chart-card-header"
import { ChartSkeleton } from "@/features/dashboard/components/loading-states"
import { MetricCard } from "@/features/dashboard/components/metric-card"
import { NextWateringCard } from "@/features/dashboard/components/next-watering-card"
import { ProbeCard } from "@/features/dashboard/components/probe-card"
import { TemperatureChart } from "@/features/dashboard/components/temperature-chart"
import { WateringStatusCard } from "@/features/dashboard/components/watering-status-card"
import type {
  CloudState,
  DashboardLoadingState,
} from "@/features/dashboard/lib/dashboard-types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { sensorHealth } from "@/lib/experiment/analytics"
import {
  baselineVerdictLabel,
  computeWeighCompletion,
} from "@/lib/experiment/irrigation"
import {
  CHANNELS,
  type ChartRange,
  type ExperimentSummary,
  type IrrigationEvent,
  type NormalizedReading,
  type WateringStatus,
} from "@/lib/experiment/types"

export function DashboardView({
  cloudState,
  health,
  chartRange,
  irrigationEvents,
  latest,
  loadingState,
  onChartRangeChange,
  onLogWatering,
  onLogWeight,
  spread,
  summary,
  tempData,
  wateringStatus,
}: {
  cloudState: CloudState
  health: ReturnType<typeof sensorHealth>
  chartRange: ChartRange
  irrigationEvents: IrrigationEvent[]
  latest: Map<string, NormalizedReading>
  loadingState: DashboardLoadingState
  onChartRangeChange: (value: ChartRange) => void
  onLogWatering: () => void
  onLogWeight: () => void
  spread: number | null
  summary: ExperimentSummary | null
  tempData: Array<Record<string, number | string | null>>
  wateringStatus: WateringStatus
}) {
  const completion =
    summary?.weighCompletion ?? computeWeighCompletion([], new Date())

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <WateringStatusCard
          status={wateringStatus}
          onLogWatering={onLogWatering}
          onLogWeight={onLogWeight}
        />
        <NextWateringCard events={irrigationEvents} />
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <MetricCard
          label="Sensor Health"
          value={`${health.ok}/${health.total}`}
          detail={`${health.percent}% channels online`}
          icon={ThermometerIcon}
          loading={loadingState.readingsLoading}
        />
        <MetricCard
          label="Cloud Rows"
          value={String(cloudState.rowCount)}
          detail={cloudState.message}
          icon={CloudIcon}
          loading={loadingState.readingsLoading}
        />
        <MetricCard
          label="Weigh Completion"
          value={`${completion.completed}/${completion.total}`}
          detail={
            completion.skipped
              ? `${completion.skipped} schedule with skipped slots`
              : completion.due
                ? `${completion.due} checkpoint due`
                : `${completion.percent}% completed`
          }
          icon={CheckCircle2Icon}
          loading={loadingState.summaryLoading}
        />
        <MetricCard
          label="Thermal Spread"
          value={spread === null ? "--" : `${spread.toFixed(2)} C`}
          detail="Latest configured-channel delta"
          icon={GaugeIcon}
          loading={loadingState.readingsLoading}
        />
      </div>

      <Alert>
        <ScaleIcon aria-hidden="true" />
        <AlertTitle>Current Watering Read</AlertTitle>
        <AlertDescription>
          {summary?.baseline.verdict
            ? `${baselineVerdictLabel(summary.baseline.verdict)} from final checkpoint mass.`
            : "Log checkpoint weights to read the baseline trend."}
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 lg:grid-cols-4">
        {CHANNELS.map((channel) => (
          <ProbeCard
            key={channel.id}
            channel={channel}
            loading={loadingState.readingsLoading}
            reading={latest.get(channel.id)}
          />
        ))}
      </div>

      <Card>
        <ChartCardHeader
          title="Temperature Trace"
          description="Bucketed Supabase readings with watering markers."
          chartRange={chartRange}
          loading={loadingState.summaryRefreshing}
          onChartRangeChange={onChartRangeChange}
        />
        <CardContent>
          {loadingState.summaryLoading || loadingState.readingsLoading ? (
            <ChartSkeleton />
          ) : (
            <TemperatureChart
              data={tempData}
              markers={summary?.irrigationMarkers ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
