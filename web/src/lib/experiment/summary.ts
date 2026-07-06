import {
  dailySwing,
  gradientSeriesFromChartRows,
  irrigationRelaxationFromEvents,
} from "./analytics"
import {
  bucketStart,
  bucketTimeLabel,
  computeBaselineDrift,
  computeCheckpointDrainage,
  computeDailyWaterUse,
  computeWeighCompletion,
  eventMarkers,
} from "./irrigation"
import { CHANNELS } from "./types"
import type {
  BucketSize,
  ExperimentSummary,
  IrrigationEvent,
  NormalizedReading,
  WeekAnalysisResult,
} from "./types"

type BucketAccumulator = {
  time: string
  timestamp: string
  values: Record<string, { sum: number; count: number }>
}

export function bucketedChartSeries(
  readings: NormalizedReading[],
  bucket: BucketSize
) {
  const grouped = new Map<number, BucketAccumulator>()

  for (const reading of readings) {
    if (reading.status !== "ok" || reading.celsius === null) {
      continue
    }

    const start = bucketStart(reading.receivedAt, bucket)
    const row =
      grouped.get(start) ??
      ({
        time: bucketTimeLabel(new Date(start), bucket),
        timestamp: new Date(start).toISOString(),
        values: {},
      } satisfies BucketAccumulator)
    const value = row.values[reading.channelId] ?? { sum: 0, count: 0 }
    value.sum += reading.celsius
    value.count += 1
    row.values[reading.channelId] = value
    grouped.set(start, row)
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) => {
      const result: Record<string, number | string | null> = {
        time: row.time,
        timestamp: row.timestamp,
      }

      for (const [channelId, value] of Object.entries(row.values)) {
        result[channelId] = Number((value.sum / value.count).toFixed(2))
      }

      return result
    })
}

const GROW_BAG_CHANNEL_IDS = new Set<string>(CHANNELS.map((channel) => channel.id))

function temperatureStats(readings: NormalizedReading[]) {
  let min: number | null = null
  let max: number | null = null

  for (const reading of readings) {
    if (
      reading.status !== "ok" ||
      reading.celsius === null ||
      // Exclude non grow-bag channels (e.g. the `water` probe) from the stat.
      !GROW_BAG_CHANNEL_IDS.has(reading.channelId)
    ) {
      continue
    }

    min = min === null ? reading.celsius : Math.min(min, reading.celsius)
    max = max === null ? reading.celsius : Math.max(max, reading.celsius)
  }

  return {
    min: min === null ? null : Number(min.toFixed(2)),
    max: max === null ? null : Number(max.toFixed(2)),
  }
}

export function buildExperimentSummary({
  bucket,
  events,
  generatedAt = new Date().toISOString(),
  rowCount,
  readings,
}: {
  bucket: BucketSize
  events: IrrigationEvent[]
  generatedAt?: string
  rowCount: number
  readings: NormalizedReading[]
}): ExperimentSummary {
  const temperatureSeries = bucketedChartSeries(readings, bucket)

  return {
    ok: true,
    bucket,
    rowCount,
    readingCount: readings.length,
    generatedAt,
    temperatureSeries,
    gradientData: gradientSeriesFromChartRows(temperatureSeries),
    swingData: dailySwing(readings, "roots"),
    irrigationMarkers: eventMarkers(events, bucket),
    baseline: computeBaselineDrift(events),
    dailyWaterUse: computeDailyWaterUse(events),
    checkpointDrainage: computeCheckpointDrainage(events),
    wateringRecovery: irrigationRelaxationFromEvents(readings, events),
    weighCompletion: computeWeighCompletion(events),
    temperatureStats: temperatureStats(readings),
  }
}

export function buildFallbackSummary(
  readings: NormalizedReading[],
  events: IrrigationEvent[],
  bucket: BucketSize
) {
  const rows = bucketedChartSeries(readings, bucket)

  return {
    ok: true,
    bucket,
    rowCount: Math.ceil(readings.length / 4),
    readingCount: readings.length,
    generatedAt: new Date().toISOString(),
    temperatureSeries: rows,
    gradientData: gradientSeriesFromChartRows(rows),
    swingData: dailySwing(readings, "roots"),
    irrigationMarkers: eventMarkers(events, bucket),
    baseline: computeBaselineDrift(events),
    dailyWaterUse: computeDailyWaterUse(events),
    checkpointDrainage: computeCheckpointDrainage(events),
    wateringRecovery: irrigationRelaxationFromEvents(readings, events),
    weighCompletion: computeWeighCompletion(events),
    temperatureStats: temperatureStats(readings),
  } satisfies ExperimentSummary
}

export function toWeekAnalysis(
  summary: ExperimentSummary,
  from: string,
  to: string
): WeekAnalysisResult {
  return {
    ...summary,
    from,
    to,
    fullResolution: true,
  }
}
