import { describe, expect, it } from "vitest"

import {
  calibrationTrialsToCsv,
  rainGaugeAnalyticsToCsv,
  rainGaugeReadingsToCsv,
} from "./csv"
import type { CalibrationSummary, RainGaugeReading, RainGaugeSummary } from "./types"

const reading: RainGaugeReading = {
  id: "r1",
  sessionId: "s1",
  receivedAt: "2026-07-03T00:00:00.000Z",
  source: "ap",
  raw: "{}",
  type: "rain_gauge",
  seq: 1,
  ms: 1000,
  edges: 2,
  tips: 1,
  lastEdgeMs: 900,
  rainfallMl: 2.3695,
  rainfallMm: null,
  rateMlPerMin: 2.3695,
  rateMmPerHr: null,
}

describe("rain gauge csv", () => {
  it("exports readings with one row per AP packet", () => {
    const csv = rainGaugeReadingsToCsv([reading])

    expect(csv.split("\n")).toHaveLength(2)
    expect(csv).toContain("session_id,received_at,seq")
    expect(csv).toContain("2.3695")
  })

  it("exports calibration rows and escapes notes", () => {
    const csv = calibrationTrialsToCsv([
      {
        id: "c1",
        sourceRow: 48,
        bucket1VolumeMl: 2,
        bucket2VolumeMl: 2.5,
        pairAverageMl: 2.25,
        method: "syringe",
        notes: 'flow, "fast"',
      },
    ])

    expect(csv).toContain('"flow, ""fast"""')
  })

  it("exports rain analytics and calibration summary metrics", () => {
    const summary: RainGaugeSummary = {
      latest: reading,
      pendingHalfTip: false,
      totalReadings: 1,
      totalRainfallMl: 2.3695,
      totalRainfallMm: null,
      maxRateMlPerMin: 2.3695,
      maxRateMmPerHr: null,
      lastTipAt: reading.receivedAt,
      series: [],
      hourlyTotals: [{ time: reading.receivedAt, rainfallMl: 2.3695, rainfallMm: null }],
      dailyTotals: [{ day: "2026-07-03", rainfallMl: 2.3695, rainfallMm: null }],
      tipIntervals: [],
    }
    const calibration: CalibrationSummary = {
      rowCount: 50,
      columnCount: 16,
      trialCount: 42,
      missingRows: 1,
      totalVolumeMl: 199.05,
      meanPairAverageMl: 2.369524,
      minPairAverageMl: 2,
      maxPairAverageMl: 2.675,
      standardDeviationMl: 0.194039,
      coefficientOfVariationPct: 8.19,
      bucket1MeanMl: 2.299048,
      bucket2MeanMl: 2.44,
      bucketBiasMl: 0.140952,
      bucket1CvPct: 13.4,
      bucket2CvPct: 8.87,
      meanAbsoluteDeltaMl: 0.300476,
      withinRangeCount: 33,
      withinRangePct: 78.57,
      footerNotes: [],
    }

    const csv = rainGaugeAnalyticsToCsv({ calibration, summary })

    expect(csv).toContain("calibration_mean")
    expect(csv).toContain("daily_total")
    expect(csv).toContain("bucket_bias")
  })
})
