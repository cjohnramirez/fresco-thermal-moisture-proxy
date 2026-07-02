import { describe, expect, it } from "vitest"

import {
  computeBaselineDrift,
  computeDailyWaterUse,
  computeFirstHourDrainage,
  computeWateringStatus,
  computeWeighCompletion,
  createIrrigationEventSchema,
  lateWeighLabel,
  toSupabaseIrrigationPayload,
  updateIrrigationEventSchema,
} from "./irrigation"
import type { IrrigationEvent } from "./types"

const baseEvent = {
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
} satisfies IrrigationEvent

describe("irrigation workflow helpers", () => {
  it("validates watering writes and weigh updates", () => {
    expect(
      createIrrigationEventSchema.safeParse({
        wateredAt: "2026-07-02T00:00:00.000Z",
        waterL: 2,
        preMassKg: 7.8,
      }).success
    ).toBe(true)
    expect(
      createIrrigationEventSchema.safeParse({
        wateredAt: "2026-07-02T00:00:00.000Z",
        waterL: 0,
      }).success
    ).toBe(false)
    expect(
      updateIrrigationEventSchema.safeParse({
        drainedMassKg: 30,
        drainedAt: "2026-07-02T01:00:00.000Z",
      }).success
    ).toBe(false)
  })

  it("weigh-only update never clobbers other columns", () => {
    const parsed = updateIrrigationEventSchema.parse({
      drainedMassKg: 8.8,
      drainedAt: "2026-07-02T01:00:00.000Z",
    })
    const payload = toSupabaseIrrigationPayload(parsed)

    expect(Object.keys(payload).sort()).toEqual([
      "drained_at",
      "drained_mass_kg",
    ])
    expect("water_l" in payload).toBe(false)
    expect("pre_mass_kg" in payload).toBe(false)
    expect("note" in payload).toBe(false)
  })

  it("explicit null in an update still clears that column", () => {
    const parsed = updateIrrigationEventSchema.parse({ preMassKg: null })

    expect(toSupabaseIrrigationPayload(parsed)).toEqual({ pre_mass_kg: null })
  })

  it("derives counting, due, overdue, and idle states from open rows", () => {
    const open = { ...baseEvent, drainedMassKg: null, drainedAt: null }

    expect(
      computeWateringStatus([open], new Date("2026-07-02T00:30:00.000Z"))
    ).toMatchObject({ state: "counting" })
    expect(
      computeWateringStatus([open], new Date("2026-07-02T01:30:00.000Z"))
    ).toMatchObject({ state: "due" })
    expect(
      computeWateringStatus([open], new Date("2026-07-02T02:00:00.000Z"))
    ).toMatchObject({ state: "overdue" })
    expect(computeWateringStatus([baseEvent])).toMatchObject({ state: "idle" })
  })

  it("counts completed, due, and overdue weigh rows", () => {
    const due = {
      ...baseEvent,
      id: "due",
      wateredAt: "2026-07-02T00:00:00.000Z",
      drainedMassKg: null,
      drainedAt: null,
    }
    const overdue = {
      ...due,
      id: "overdue",
      wateredAt: "2026-07-01T23:00:00.000Z",
    }

    expect(
      computeWeighCompletion(
        [baseEvent, due, overdue],
        new Date("2026-07-02T01:30:00.000Z")
      )
    ).toMatchObject({ completed: 1, total: 3, due: 2, overdue: 1 })
  })

  it("computes baseline drift, daily water use, and drainage", () => {
    const nextEvent = {
      ...baseEvent,
      id: "event-2",
      wateredAt: "2026-07-03T00:00:00.000Z",
      preMassKg: 7.6,
      postMassKg: 9.5,
      drainedMassKg: 8.4,
      drainedAt: "2026-07-03T01:00:00.000Z",
    }

    expect(computeBaselineDrift([baseEvent, nextEvent])).toMatchObject({
      slopeKgPerDay: -0.4,
      verdict: "needs_more",
    })
    expect(computeDailyWaterUse([baseEvent, nextEvent])[0]).toMatchObject({
      waterUseKg: 1.2,
    })
    expect(computeFirstHourDrainage([baseEvent])[0]).toMatchObject({
      drainageKg: 1,
    })
  })

  it("flags late and early weigh entries", () => {
    expect(
      lateWeighLabel({
        ...baseEvent,
        drainedAt: "2026-07-02T00:30:00.000Z",
      })
    ).toBe("early")
    expect(
      lateWeighLabel({
        ...baseEvent,
        drainedAt: "2026-07-02T01:45:00.000Z",
      })
    ).toBe("late")
    expect(lateWeighLabel(baseEvent)).toBe(null)
  })
})
