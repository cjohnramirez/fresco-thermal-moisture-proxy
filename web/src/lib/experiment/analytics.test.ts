import { describe, expect, it } from "vitest"

import {
  dailySwing,
  irrigationRelaxationFromEvents,
  sensorHealth,
  temperatureSpread,
  usableWaterTempC,
} from "./analytics"
import type { IrrigationEvent, NormalizedReading } from "./types"

const baseReading = {
  id: "r",
  sessionId: "s",
  receivedAt: "2026-07-02T00:00:00.000Z",
  seq: 1,
  deviceMs: 1,
  devices: 1,
  status: "ok",
  raw: "{}",
} satisfies Partial<NormalizedReading>

describe("analytics", () => {
  it("computes sensor health and spread", () => {
    const readings = [
      { ...baseReading, id: "1", channelId: "control", pin: 5, celsius: 27.5, fahrenheit: 81.5 },
      { ...baseReading, id: "2", channelId: "surface", pin: 4, celsius: 27, fahrenheit: 80.6 },
      { ...baseReading, id: "3", channelId: "roots", pin: 16, celsius: 26, fahrenheit: 78.8 },
      { ...baseReading, id: "4", channelId: "bottom", pin: 17, celsius: 25, fahrenheit: 77 },
    ] as NormalizedReading[]

    expect(sensorHealth(readings)).toMatchObject({ ok: 4, total: 4, percent: 100 })
    expect(temperatureSpread(readings)).toBe(2.5)
  })

  it("computes daily swing from valid temperature readings", () => {
    const readings = [
      { ...baseReading, id: "1", channelId: "roots", pin: 16, celsius: 24, fahrenheit: 75.2 },
      { ...baseReading, id: "2", channelId: "roots", pin: 16, celsius: 29, fahrenheit: 84.2 },
    ] as NormalizedReading[]

    expect(dailySwing(readings)[0]).toMatchObject({ swing: 5, min: 24, max: 29 })
  })

  it("computes watering recovery windows from Supabase irrigation rows", () => {
    const readings = [25, 24.5, 24].map(
      (celsius, index) =>
        ({
          ...baseReading,
          id: `r-${index}`,
          channelId: "roots",
          pin: 16,
          celsius,
          fahrenheit: celsius * 1.8 + 32,
          receivedAt: `2026-07-02T0${index}:00:00.000Z`,
        }) as NormalizedReading
    )
    const events = [
      {
        id: "event-1",
        bagId: "bag-1",
        wateredAt: "2026-07-02T00:00:00.000Z",
        cutoffAt: "2026-07-02T10:00:00.000Z",
        waterL: 2,
        waterTempC: null,
        weightLogs: [
          {
            slotAt: "2026-07-02T00:10:00.000Z",
            weighedAt: "2026-07-02T00:10:00.000Z",
            massKg: 11,
            note: "",
          },
        ],
        note: "",
        createdAt: "2026-07-02T00:00:00.000Z",
        archivedAt: null,
      },
    ] as IrrigationEvent[]

    expect(irrigationRelaxationFromEvents(readings, events)[0]).toMatchObject({
      wateredAt: "2026-07-02T00:00:00.000Z",
      samples: 3,
      delta: -1,
    })
  })

  it("extracts a usable water temperature only from ok, non-null readings", () => {
    expect(
      usableWaterTempC({
        ...baseReading,
        id: "w",
        channelId: "water",
        pin: 14,
        celsius: 24.8,
        fahrenheit: 76.6,
      } as NormalizedReading)
    ).toBe(24.8)

    expect(usableWaterTempC(undefined)).toBeNull()
    expect(usableWaterTempC(null)).toBeNull()
    expect(
      usableWaterTempC({
        ...baseReading,
        id: "w-off",
        channelId: "water",
        pin: 14,
        status: "no_sensor",
        celsius: 24.8,
        fahrenheit: 76.6,
      } as NormalizedReading)
    ).toBeNull()
    expect(
      usableWaterTempC({
        ...baseReading,
        id: "w-null",
        channelId: "water",
        pin: 14,
        celsius: null,
        fahrenheit: null,
      } as NormalizedReading)
    ).toBeNull()
  })
})
