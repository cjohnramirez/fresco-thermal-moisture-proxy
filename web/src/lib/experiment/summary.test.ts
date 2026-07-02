import { describe, expect, it } from "vitest"

import { buildExperimentSummary, toWeekAnalysis } from "./summary"
import type { IrrigationEvent, NormalizedReading } from "./types"

const reading = {
  sessionId: "s",
  seq: 1,
  deviceMs: 1000,
  devices: 1,
  status: "ok",
  raw: "{}",
} satisfies Partial<NormalizedReading>

describe("experiment summary", () => {
  it("returns bucketed charts and compact full-week metrics", () => {
    const readings = [
      {
        ...reading,
        id: "surface",
        receivedAt: "2026-07-02T00:03:00.000Z",
        channelId: "surface",
        pin: 4,
        celsius: 28,
        fahrenheit: 82.4,
      },
      {
        ...reading,
        id: "roots",
        receivedAt: "2026-07-02T00:07:00.000Z",
        channelId: "roots",
        pin: 16,
        celsius: 26,
        fahrenheit: 78.8,
      },
    ] as NormalizedReading[]
    const events = [
      {
        id: "event",
        bagId: "bag-1",
        wateredAt: "2026-07-02T00:00:00.000Z",
        waterL: 2,
        waterTempC: null,
        preMassKg: 7.8,
        postMassKg: 9.8,
        drainedMassKg: 8.8,
        drainedAt: "2026-07-02T01:00:00.000Z",
        note: "",
        createdAt: "2026-07-02T00:00:00.000Z",
        archivedAt: null,
      },
    ] as IrrigationEvent[]

    const summary = buildExperimentSummary({
      bucket: "10m",
      events,
      generatedAt: "2026-07-02T02:00:00.000Z",
      rowCount: 1,
      readings,
    })
    const week = toWeekAnalysis(
      summary,
      "2026-07-01T00:00:00.000Z",
      "2026-07-08T00:00:00.000Z"
    )

    expect(summary.temperatureSeries).toHaveLength(1)
    expect(summary.gradientData[0]).toMatchObject({ surfaceRoot: 2 })
    expect(summary.irrigationMarkers).toHaveLength(1)
    expect(week).toMatchObject({ fullResolution: true, rowCount: 1 })
  })
})
