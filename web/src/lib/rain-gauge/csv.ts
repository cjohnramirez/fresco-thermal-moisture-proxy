import type {
  CalibrationSummary,
  CalibrationTrial,
  RainGaugeReading,
  RainGaugeSummary,
} from "./types"

const readingHeaders = [
  "session_id",
  "received_at",
  "seq",
  "device_ms",
  "edges",
  "tips",
  "last_edge_ms",
  "rainfall_ml",
  "rainfall_mm",
  "rate_ml_per_min",
  "rate_mm_per_hr",
  "source",
]

const calibrationHeaders = [
  "source_row",
  "bucket_1_volume_ml",
  "bucket_2_volume_ml",
  "pair_average_ml",
  "method",
  "notes",
]

const analyticsHeaders = ["metric", "time", "value", "unit", "notes"]

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

export function rainGaugeReadingsToCsv(readings: RainGaugeReading[]) {
  return rows(
    readingHeaders,
    readings.map((reading) => [
      reading.sessionId,
      reading.receivedAt,
      reading.seq,
      reading.ms,
      reading.edges,
      reading.tips,
      reading.lastEdgeMs,
      reading.rainfallMl,
      reading.rainfallMm,
      reading.rateMlPerMin,
      reading.rateMmPerHr,
      reading.source,
    ])
  )
}

export function calibrationTrialsToCsv(trials: CalibrationTrial[]) {
  return rows(
    calibrationHeaders,
    trials.map((trial) => [
      trial.sourceRow,
      trial.bucket1VolumeMl,
      trial.bucket2VolumeMl,
      trial.pairAverageMl,
      trial.method,
      trial.notes,
    ])
  )
}

export function rainGaugeAnalyticsToCsv({
  calibration,
  summary,
}: {
  calibration: CalibrationSummary | null
  summary: RainGaugeSummary
}) {
  const values: unknown[][] = [
    ["total_rainfall", "", summary.totalRainfallMl, "ml", ""],
    ["total_tips", "", summary.latest?.tips ?? 0, "tips", ""],
    ["total_edges", "", summary.latest?.edges ?? 0, "edges", ""],
    ["max_rate", "", summary.maxRateMlPerMin, "ml/min", ""],
  ]

  for (const row of summary.hourlyTotals) {
    values.push(["hourly_total", row.time, row.rainfallMl, "ml", ""])
  }

  for (const row of summary.dailyTotals) {
    values.push(["daily_total", row.day, row.rainfallMl, "ml", ""])
  }

  if (calibration) {
    values.push(
      ["calibration_mean", "", calibration.meanPairAverageMl, "ml/tip", ""],
      [
        "calibration_cv",
        "",
        calibration.coefficientOfVariationPct,
        "%",
        "pair average coefficient of variation",
      ],
      ["bucket_bias", "", calibration.bucketBiasMl, "ml", "bucket2 minus bucket1"],
      [
        "within_range",
        "",
        calibration.withinRangePct,
        "%",
        `${calibration.withinRangeCount} of ${calibration.trialCount} trials`,
      ]
    )
  }

  return rows(analyticsHeaders, values)
}
