import { describe, expect, it } from "vitest"

import { normalizeSupabaseRows, parseFirmwareLine } from "./parser"

const sessionId = "test-session"

describe("parseFirmwareLine", () => {
  it("normalizes a four-channel firmware packet", () => {
    const result = parseFirmwareLine(
      JSON.stringify({
        type: "temperature",
        seq: 7,
        ms: 7000,
        sensors: 4,
        ts: "ok",
        channels: [
          { id: "control", pin: 5, devices: 1, ts: "ok", tc: 24, tf: 75.2 },
          { id: "surface", pin: 4, devices: 1, ts: "ok", tc: 24.5, tf: 76.1 },
          { id: "roots", pin: 16, devices: 1, ts: "ok", tc: 25, tf: 77 },
          { id: "bottom", pin: 17, devices: 1, ts: "ok", tc: 24, tf: 75.2 },
        ],
      }),
      sessionId,
      "2026-07-02T00:00:00.000Z"
    )

    expect(result?.ok).toBe(true)
    expect(result?.readings).toHaveLength(4)
    expect(result?.readings[2]).toMatchObject({
      channelId: "roots",
      pin: 16,
      celsius: 25,
      status: "ok",
    })
  })

  it("keeps no_sensor channel state visible", () => {
    const result = parseFirmwareLine(
      JSON.stringify({
        type: "temperature",
        seq: 8,
        ms: 8000,
        sensors: 1,
        ts: "partial",
        channels: [
          { id: "surface", pin: 4, devices: 0, ts: "no_sensor", tc: null, tf: null },
        ],
      }),
      sessionId
    )

    expect(result?.readings[0]).toMatchObject({
      status: "no_sensor",
      celsius: null,
      devices: 0,
    })
  })

  it("returns a parse_error row for malformed lines", () => {
    const result = parseFirmwareLine("not json", sessionId)

    expect(result?.ok).toBe(false)
    expect(result?.readings[0]).toMatchObject({
      channelId: "parse_error",
      status: "parse_error",
    })
  })

  it("normalizes Supabase jsonb payload rows", () => {
    const readings = normalizeSupabaseRows(
      [
        {
          id: 10,
          created_at: "2026-07-02T00:00:00.000Z",
          payload: {
            type: "temperature",
            seq: 10,
            ms: 10000,
            sensors: 1,
            ts: "partial",
            channels: [
              { id: "bottom", pin: 17, devices: 1, ts: "ok", tc: 23.5, tf: 74.3 },
            ],
          },
        },
      ],
      sessionId
    )

    expect(readings).toHaveLength(1)
    expect(readings[0]).toMatchObject({
      id: "test-session:10:bottom",
      receivedAt: "2026-07-02T00:00:00.000Z",
      channelId: "bottom",
      celsius: 23.5,
    })
  })
})
