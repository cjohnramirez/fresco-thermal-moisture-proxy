import {
  CheckCircle2Icon,
  CloudIcon,
  GaugeIcon,
  ScaleIcon,
  ThermometerIcon,
} from "lucide-react"

import { ChartCardHeader } from "@/components/dashboard/chart-card-header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { ProbeCard } from "@/components/dashboard/probe-card"
import { TemperatureChart } from "@/components/dashboard/temperature-chart"
import { WateringStatusCard } from "@/components/dashboard/watering-status-card"
import type { CloudState } from "@/components/dashboard/dashboard-types"
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
  type NormalizedReading,
  type WateringStatus,
} from "@/lib/experiment/types"

export function DashboardView({
  cloudState,
  health,
  chartRange,
  latest,
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
  latest: Map<string, NormalizedReading>
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
      <WateringStatusCard
        status={wateringStatus}
        onLogWatering={onLogWatering}
        onLogWeight={onLogWeight}
      />

      <div className="grid gap-3 lg:grid-cols-4">
        <MetricCard
          label="Sensor Health"
          value={`${health.ok}/${health.total}`}
          detail={`${health.percent}% channels online`}
          icon={ThermometerIcon}
        />
        <MetricCard
          label="Cloud Rows"
          value={String(cloudState.rowCount)}
          detail={cloudState.message}
          icon={CloudIcon}
        />
        <MetricCard
          label="Weigh Completion"
          value={`${completion.completed}/${completion.total}`}
          detail={
            completion.overdue
              ? `${completion.overdue} overdue weigh`
              : completion.due
                ? `${completion.due} weigh due`
                : `${completion.percent}% completed`
          }
          icon={CheckCircle2Icon}
        />
        <MetricCard
          label="Thermal Spread"
          value={spread === null ? "--" : `${spread.toFixed(2)} C`}
          detail="Latest configured-channel delta"
          icon={GaugeIcon}
        />
      </div>

      <Alert>
        <ScaleIcon aria-hidden="true" />
        <AlertTitle>Current Watering Read</AlertTitle>
        <AlertDescription>
          {summary?.baseline.verdict
            ? `${baselineVerdictLabel(summary.baseline.verdict)} from drained-mass baseline.`
            : "Log drained weights to read the baseline trend."}
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 lg:grid-cols-4">
        {CHANNELS.map((channel) => (
          <ProbeCard
            key={channel.id}
            channel={channel}
            reading={latest.get(channel.id)}
          />
        ))}
      </div>

      <Card>
        <ChartCardHeader
          title="Temperature Trace"
          description="Bucketed Supabase readings with watering markers."
          chartRange={chartRange}
          onChartRangeChange={onChartRangeChange}
        />
        <CardContent>
          <TemperatureChart
            data={tempData}
            markers={summary?.irrigationMarkers ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
