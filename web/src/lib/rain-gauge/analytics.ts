import type {
  RainGaugeChartRange,
  RainGaugeReading,
  RainGaugeSummary,
} from "./types"

const RANGE_MS: Record<RainGaugeChartRange, number> = {
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
}

function bucketTimestamp(iso: string, bucketMs: number) {
  const time = Date.parse(iso)
  return new Date(Math.floor(time / bucketMs) * bucketMs).toISOString()
}

function bucketSizeForRange(range: RainGaugeChartRange) {
  if (range === "1h") {
    return 60_000
  }
  if (range === "1d") {
    return 10 * 60_000
  }
  return 60 * 60_000
}

export function rainGaugeReadingsForRange(
  readings: RainGaugeReading[],
  range: RainGaugeChartRange,
  now = Date.now()
) {
  const cutoff = now - RANGE_MS[range]
  return readings.filter((reading) => Date.parse(reading.receivedAt) >= cutoff)
}

export function buildRainGaugeSummary(
  readings: RainGaugeReading[],
  range: RainGaugeChartRange
): RainGaugeSummary {
  const sorted = readings
    .slice()
    .sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt))
  const ranged = rainGaugeReadingsForRange(sorted, range)
  const latest = sorted.at(-1) ?? null
  const chartRows = ranged.length > 0 ? ranged : sorted.slice(-1)
  const bucketMs = bucketSizeForRange(range)
  const bucketMap = new Map<
    string,
    {
      time: string
      rainfallMl: number
      rainfallMm: number | null
      rateMlPerMin: number
      rateMmPerHr: number | null
      tips: number
      edges: number
    }
  >()

  for (const reading of chartRows) {
    const time = bucketTimestamp(reading.receivedAt, bucketMs)
    bucketMap.set(time, {
      time,
      rainfallMl: reading.rainfallMl,
      rainfallMm: reading.rainfallMm,
      rateMlPerMin: reading.rateMlPerMin,
      rateMmPerHr: reading.rateMmPerHr,
      tips: reading.tips,
      edges: reading.edges,
    })
  }

  const hourlyTotals = cumulativeDeltas(sorted, 60 * 60_000)
  const dailyTotals = dailyDeltas(sorted)
  const tipIntervals = intervalSeries(sorted)

  return {
    latest,
    pendingHalfTip: Boolean(latest && latest.edges % 2 === 1),
    totalReadings: sorted.length,
    totalRainfallMl: latest?.rainfallMl ?? 0,
    totalRainfallMm: latest?.rainfallMm ?? null,
    maxRateMlPerMin: maxNumber(sorted.map((reading) => reading.rateMlPerMin)),
    maxRateMmPerHr: maxNumber(
      sorted
        .map((reading) => reading.rateMmPerHr)
        .filter((value): value is number => value !== null)
    ),
    lastTipAt: lastTipAt(sorted),
    series: Array.from(bucketMap.values()),
    hourlyTotals,
    dailyTotals,
    tipIntervals,
  }
}

function maxNumber(values: number[]) {
  return values.length > 0 ? Math.max(...values) : null
}

function lastTipAt(readings: RainGaugeReading[]) {
  for (let index = readings.length - 1; index >= 0; index--) {
    const reading = readings[index]
    const previous = readings[index - 1]
    if (!previous || reading.tips > previous.tips) {
      return reading.tips > 0 ? reading.receivedAt : null
    }
  }
  return null
}

function cumulativeDeltas(readings: RainGaugeReading[], bucketMs: number) {
  const buckets = new Map<
    string,
    { time: string; first: RainGaugeReading; last: RainGaugeReading }
  >()

  for (const reading of readings) {
    const key = bucketTimestamp(reading.receivedAt, bucketMs)
    const existing = buckets.get(key)
    if (!existing) {
      buckets.set(key, { time: key, first: reading, last: reading })
    } else {
      existing.last = reading
    }
  }

  return Array.from(buckets.values()).map((bucket) => ({
    time: bucket.time,
    rainfallMl: Math.max(
      0,
      Number((bucket.last.rainfallMl - bucket.first.rainfallMl).toFixed(3))
    ),
    rainfallMm:
      bucket.last.rainfallMm !== null && bucket.first.rainfallMm !== null
        ? Math.max(
            0,
            Number((bucket.last.rainfallMm - bucket.first.rainfallMm).toFixed(3))
          )
        : null,
  }))
}

function dailyDeltas(readings: RainGaugeReading[]) {
  const rows = cumulativeDeltas(readings, 24 * 60 * 60_000)
  return rows.map((row) => ({
    day: row.time.slice(0, 10),
    rainfallMl: row.rainfallMl,
    rainfallMm: row.rainfallMm,
  }))
}

function intervalSeries(readings: RainGaugeReading[]) {
  const tipReadings: RainGaugeReading[] = []
  for (let index = 0; index < readings.length; index++) {
    const reading = readings[index]
    const previous = readings[index - 1]
    if (reading.tips > 0 && (!previous || reading.tips > previous.tips)) {
      tipReadings.push(reading)
    }
  }

  return tipReadings.slice(1).map((reading, index) => ({
    time: reading.receivedAt,
    intervalSeconds: Number(
      (
        (Date.parse(reading.receivedAt) -
          Date.parse(tipReadings[index].receivedAt)) /
        1000
      ).toFixed(1)
    ),
  }))
}
