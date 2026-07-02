import type {
  IrrigationEvent,
  NormalizedReading,
  WeekAnalysisResult,
} from "./types"

const readingHeaders = [
  "session_id",
  "received_at",
  "seq",
  "device_ms",
  "channel_id",
  "pin",
  "devices",
  "status",
  "celsius",
  "fahrenheit",
]

const irrigationEventHeaders = [
  "id",
  "bag_id",
  "watered_at",
  "water_l",
  "water_temp_c",
  "pre_mass_kg",
  "post_mass_kg",
  "drained_mass_kg",
  "drained_at",
  "note",
  "created_at",
  "archived_at",
]
const weekAnalysisHeaders = [
  "metric",
  "day",
  "value",
  "unit",
  "from",
  "to",
  "notes",
]

function cell(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function rows(headers: string[], values: unknown[][]) {
  return [headers, ...values].map((row) => row.map(cell).join(",")).join("\n")
}

export function readingsToCsv(readings: NormalizedReading[]) {
  return rows(
    readingHeaders,
    readings.map((reading) => [
      reading.sessionId,
      reading.receivedAt,
      reading.seq,
      reading.deviceMs,
      reading.channelId,
      reading.pin,
      reading.devices,
      reading.status,
      reading.celsius,
      reading.fahrenheit,
    ])
  )
}

export function irrigationEventsToCsv(
  events: IrrigationEvent[],
  includeArchived = false
) {
  return rows(
    irrigationEventHeaders,
    events
      .filter((event) => includeArchived || event.archivedAt === null)
      .map((event) => [
        event.id,
        event.bagId,
        event.wateredAt,
        event.waterL,
        event.waterTempC,
        event.preMassKg,
        event.postMassKg,
        event.drainedMassKg,
        event.drainedAt,
        event.note,
        event.createdAt,
        event.archivedAt,
      ])
  )
}

export function weekAnalysisToCsv(analysis: WeekAnalysisResult) {
  const values: unknown[][] = [
    [
      "baseline_slope",
      "",
      analysis.baseline.slopeKgPerDay,
      "kg/day",
      analysis.from,
      analysis.to,
      analysis.baseline.verdict,
    ],
    [
      "temperature_min",
      "",
      analysis.temperatureStats.min,
      "C",
      analysis.from,
      analysis.to,
      "",
    ],
    [
      "temperature_max",
      "",
      analysis.temperatureStats.max,
      "C",
      analysis.from,
      analysis.to,
      "",
    ],
  ]

  for (const row of analysis.dailyWaterUse) {
    values.push([
      "daily_water_use",
      row.day,
      row.waterUseKg,
      "kg",
      row.fromWateredAt,
      row.toWateredAt,
      "",
    ])
  }

  for (const row of analysis.firstHourDrainage) {
    values.push([
      "first_hour_drainage",
      row.day,
      row.drainageKg,
      "kg",
      row.wateredAt,
      "",
      "",
    ])
  }

  for (const row of analysis.swingData) {
    values.push(["root_temp_swing", row.day, row.swing, "C", "", "", ""])
  }

  return rows(weekAnalysisHeaders, values)
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
