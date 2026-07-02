import { describe, expect, it } from "vitest"

import {
  irrigationEventsToCsv,
  readingsToCsv,
  weekAnalysisToCsv,
} from "./csv"
import type {
  IrrigationEvent,
  NormalizedReading,
  WeekAnalysisResult,
} from "./types"

describe("csv export", () => {
  it("exports one row per normalized reading", () => {
    const csv = readingsToCsv([
      {
        id: "r",
        sessionId: "s",
        receivedAt: "2026-07-02T00:00:00.000Z",
        seq: 1,
        deviceMs: 1000,
        channelId: "surface",
        pin: 4,
        devices: 1,
        status: "ok",
        celsius: 25,
        fahrenheit: 77,
        raw: "{}",
      },
    ] as NormalizedReading[])

    expect(csv.split("\n")).toHaveLength(2)
    expect(csv).toContain("session_id,received_at,seq")
  })

  it("exports active irrigation events and escapes notes", () => {
    const csv = irrigationEventsToCsv([
      {
        id: "event-1",
        bagId: "bag-1",
        wateredAt: "2026-07-02T00:00:00.000Z",
        waterL: 2,
        waterTempC: 24.5,
        preMassKg: 7.5,
        postMassKg: 9.5,
        drainedMassKg: 8.8,
        drainedAt: "2026-07-02T01:00:00.000Z",
        note: 'watered, then "weighed"',
        createdAt: "2026-07-02T00:00:00.000Z",
        archivedAt: null,
      },
      {
        id: "archived",
        bagId: "bag-1",
        wateredAt: "2026-07-01T00:00:00.000Z",
        waterL: 2,
        waterTempC: null,
        preMassKg: null,
        postMassKg: null,
        drainedMassKg: null,
        drainedAt: null,
        note: "",
        createdAt: "2026-07-01T00:00:00.000Z",
        archivedAt: "2026-07-01T02:00:00.000Z",
      },
    ] as IrrigationEvent[])

    expect(csv.split("\n")).toHaveLength(2)
    expect(csv).toContain('"watered, then ""weighed"""')
    expect(csv).not.toContain("2026-07-01T00:00:00.000Z")
  })

  it("exports compact full-week analysis metrics", () => {
    const csv = weekAnalysisToCsv({
      ok: true,
      bucket: "10m",
      rowCount: 100,
      readingCount: 400,
      generatedAt: "2026-07-02T00:00:00.000Z",
      temperatureSeries: [],
      gradientData: [],
      swingData: [{ day: "2026-07-02", swing: 4, min: 24, max: 28 }],
      irrigationMarkers: [],
      baseline: {
        points: [],
        slopeKgPerDay: -0.1,
        verdict: "needs_more",
      },
      dailyWaterUse: [
        {
          day: "2026-07-02",
          fromWateredAt: "2026-07-01T00:00:00.000Z",
          toWateredAt: "2026-07-02T00:00:00.000Z",
          waterUseKg: 1.2,
        },
      ],
      firstHourDrainage: [],
      wateringRecovery: [],
      weighCompletion: { completed: 1, total: 1, due: 0, overdue: 0, percent: 100 },
      temperatureStats: { min: 24, max: 28 },
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-08T00:00:00.000Z",
      fullResolution: true,
    } satisfies WeekAnalysisResult)

    expect(csv).toContain("baseline_slope")
    expect(csv).toContain("daily_water_use")
    expect(csv).toContain("root_temp_swing")
  })
})
