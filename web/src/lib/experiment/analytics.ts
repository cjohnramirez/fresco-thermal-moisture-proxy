import { differenceInMinutes, format } from "date-fns"

import {
  CHANNELS,
  type IrrigationEvent,
  type NormalizedReading,
} from "./types"

export function latestByChannel(readings: NormalizedReading[]) {
  const latest = new Map<string, NormalizedReading>()

  for (const reading of readings) {
    if (reading.status === "parse_error") {
      continue
    }

    latest.set(reading.channelId, reading)
  }

  return latest
}

// Extracts a usable Celsius value from a reading (e.g. the `water` channel).
// Returns null unless the reading is present, `ok`, and has a numeric value.
export function usableWaterTempC(
  reading: NormalizedReading | null | undefined
): number | null {
  return reading && reading.status === "ok" && reading.celsius !== null
    ? reading.celsius
    : null
}

export function sensorHealth(readings: NormalizedReading[]) {
  const latest = latestByChannel(readings)
  let ok = 0

  for (const channel of CHANNELS) {
    if (latest.get(channel.id)?.status === "ok") {
      ok++
    }
  }

  return {
    ok,
    total: CHANNELS.length,
    percent: Math.round((ok / CHANNELS.length) * 100),
  }
}

export function temperatureSpread(readings: NormalizedReading[]) {
  const latest = latestByChannel(readings)
  const values = CHANNELS.flatMap((channel) => {
    const value = latest.get(channel.id)?.celsius
    return value === null || value === undefined ? [] : [value]
  })

  if (values.length < 2) {
    return null
  }

  let min = values[0]
  let max = values[0]
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }

  return Number((max - min).toFixed(2))
}

export function chartSeries(readings: NormalizedReading[]) {
  const grouped = new Map<string, Record<string, number | string | null>>()

  for (const reading of readings) {
    if (reading.status === "parse_error") {
      continue
    }

    const key = reading.receivedAt
    const row = grouped.get(key) ?? {
      time: format(new Date(reading.receivedAt), "HH:mm:ss"),
      timestamp: reading.receivedAt,
    }

    row[reading.channelId] = reading.celsius
    grouped.set(key, row)
  }

  return Array.from(grouped.values()).slice(-180)
}

export function gradientSeriesFromChartRows(
  rows: Array<Record<string, number | string | null>>
) {
  return rows.map((row) => {
    const surface = typeof row.surface === "number" ? row.surface : null
    const root = typeof row.roots === "number" ? row.roots : null
    const bottom = typeof row.bottom === "number" ? row.bottom : null

    return {
      time: row.time,
      timestamp: row.timestamp ?? null,
      surfaceRoot: surface !== null && root !== null ? Number((surface - root).toFixed(2)) : null,
      rootBottom: root !== null && bottom !== null ? Number((root - bottom).toFixed(2)) : null,
    }
  })
}

export function gradientSeries(readings: NormalizedReading[]) {
  return gradientSeriesFromChartRows(chartSeries(readings))
}

export function dailySwing(readings: NormalizedReading[], channelId?: string) {
  const groups = new Map<string, number[]>()

  for (const reading of readings) {
    if (reading.celsius === null || reading.status !== "ok") {
      continue
    }
    if (channelId && reading.channelId !== channelId) {
      continue
    }

    const day = format(new Date(reading.receivedAt), "yyyy-MM-dd")
    const values = groups.get(day) ?? []
    values.push(reading.celsius)
    groups.set(day, values)
  }

  return Array.from(groups.entries()).map(([day, values]) => {
    let min = values[0]
    let max = values[0]
    for (const value of values) {
      if (value < min) min = value
      if (value > max) max = value
    }

    return {
      day,
      swing: Number((max - min).toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
    }
  })
}

export function irrigationRelaxationFromEvents(
  readings: NormalizedReading[],
  events: IrrigationEvent[]
) {
  return events
    .filter((event) => event.archivedAt === null)
    .map((event) => {
      const eventTime = new Date(event.wateredAt)
      const rootReadings = readings
        .filter((reading) => reading.channelId === "roots" && reading.celsius !== null)
        .filter((reading) => {
          const minutes = differenceInMinutes(new Date(reading.receivedAt), eventTime)
          return minutes >= 0 && minutes <= 120
        })

      const first = rootReadings[0]?.celsius ?? null
      const last = rootReadings[rootReadings.length - 1]?.celsius ?? null

      return {
        event: format(eventTime, "HH:mm"),
        wateredAt: event.wateredAt,
        samples: rootReadings.length,
        delta: first !== null && last !== null ? Number((last - first).toFixed(2)) : null,
      }
    })
}
