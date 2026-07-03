import { describe, expect, it } from "vitest"

import {
  isPendingHalfTip,
  normalizeRainGaugeReading,
  parseRainGaugeReadingJson,
  parseRainGaugeStatus,
} from "./parser"

describe("rain gauge parser", () => {
  it("parses the flashed firmware reading packet", () => {
    const packet = parseRainGaugeReadingJson(
      JSON.stringify({
        type: "rain_gauge",
        seq: 12,
        ms: 123456,
        edges: 85,
        tips: 42.5,
        lastEdgeMs: 120000,
        rainfallMl: 99.519,
        rainfallMm: null,
        rateMlPerMin: 3.2,
        rateMmPerHr: null,
      })
    )

    expect(packet.tips).toBe(42.5)
    expect(isPendingHalfTip(packet)).toBe(true)
  })

  it("normalizes readings with session ids and raw payload", () => {
    const reading = normalizeRainGaugeReading({
      packet: {
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
      },
      receivedAt: "2026-07-03T00:00:00.000Z",
      sessionId: "rain-session",
    })

    expect(reading).toMatchObject({
      id: "rain-session-1-1000-2",
      sessionId: "rain-session",
      receivedAt: "2026-07-03T00:00:00.000Z",
      source: "ap",
    })
  })

  it("parses status with calibration and AP metadata", () => {
    const status = parseRainGaugeStatus({
      device: "nodemcu-32s",
      uptimeMs: 100,
      sessionStartMs: 50,
      ssid: "FrescoRainGauge",
      ip: "192.168.4.1",
      clients: 1,
      sseClients: 2,
      tipPin: 34,
      debounceMs: 50,
      countsBothEdges: true,
      mlPerTip: 2.3695,
      catchmentAreaCm2: null,
      mmPerTip: null,
      edges: 3,
      tips: 1.5,
    })

    expect(status).toMatchObject({
      countsBothEdges: true,
      mlPerTip: 2.3695,
      tipPin: 34,
    })
  })
})
