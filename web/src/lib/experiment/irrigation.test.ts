import { describe, expect, it } from "vitest"

import {
  computeBaselineDrift,
  computeCheckpointDrainage,
  computeDailyWaterUse,
  computeNextWatering,
  computeWateringStatus,
  computeWeighCompletion,
  createIrrigationEventSchema,
  expectedWeightSlots,
  mergeWeightLog,
  toSupabaseIrrigationPayload,
  updateIrrigationEventSchema,
  weightSlotsForEvent,
} from "./irrigation"
import type { IrrigationEvent } from "./types"

const baseEvent = {
  id: "event",
  bagId: "bag-1",
  wateredAt: "2026-07-02T00:00:00.000Z",
  cutoffAt: "2026-07-02T10:00:00.000Z",
  waterL: 2,
  waterTempC: null,
  weightLogs: [
    {
      slotAt: "2026-07-02T00:10:00.000Z",
      weighedAt: "2026-07-02T00:10:00.000Z",
      massKg: 9.8,
      note: "",
    },
    {
      slotAt: "2026-07-02T10:00:00.000Z",
      weighedAt: "2026-07-02T10:01:00.000Z",
      massKg: 8.8,
      note: "final",
    },
  ],
  note: "",
  createdAt: "2026-07-02T00:00:00.000Z",
  archivedAt: null,
} satisfies IrrigationEvent

describe("irrigation workflow helpers", () => {
  it("validates watering writes and checkpoint weight updates", () => {
    expect(
      createIrrigationEventSchema.safeParse({
        wateredAt: "2026-07-02T00:00:00.000Z",
        waterL: 2,
        weightLogs: [],
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
        weightLog: {
          slotAt: "2026-07-02T00:10:00.000Z",
          weighedAt: "2026-07-02T00:10:00.000Z",
          massKg: 30,
          note: "",
        },
      }).success
    ).toBe(false)
  })

  it("serializes only touched Supabase columns", () => {
    const parsed = updateIrrigationEventSchema.parse({
      weightLogs: [baseEvent.weightLogs[0]],
    })
    const payload = toSupabaseIrrigationPayload(parsed)

    expect(Object.keys(payload)).toEqual(["weight_logs"])
    expect("water_l" in payload).toBe(false)
    expect("note" in payload).toBe(false)
  })

  it("explicit null in an update still clears that column", () => {
    const parsed = updateIrrigationEventSchema.parse({ waterTempC: null })

    expect(toSupabaseIrrigationPayload(parsed)).toEqual({ water_temp_c: null })
  })

  it("generates 10-minute slots after watering, strictly before the 6 PM cutoff", () => {
    const slots = expectedWeightSlots(baseEvent)

    expect(slots[0]).toBe("2026-07-02T00:10:00.000Z")
    // The slot that would land exactly on the 6 PM cutoff is excluded.
    expect(slots.at(-1)).toBe("2026-07-02T09:50:00.000Z")
    expect(slots).toHaveLength(59)
  })

  it("merges one weight log per schedule slot", () => {
    const merged = mergeWeightLog(
      { ...baseEvent, weightLogs: [] },
      baseEvent.weightLogs[0]
    )

    expect(merged).toEqual([baseEvent.weightLogs[0]])
    expect(() =>
      mergeWeightLog(baseEvent, {
        slotAt: "2026-07-02T00:05:00.000Z",
        weighedAt: "2026-07-02T00:05:00.000Z",
        massKg: 9,
        note: "",
      })
    ).toThrow("Selected slot")
  })

  it("derives counting, due, and idle states from an open row", () => {
    const open = { ...baseEvent, weightLogs: [] }

    expect(
      computeWateringStatus([open], new Date("2026-07-02T00:05:00.000Z"))
    ).toMatchObject({ state: "counting" })
    expect(
      computeWateringStatus([open], new Date("2026-07-02T00:15:00.000Z"))
    ).toMatchObject({ state: "due", dueSlotAt: "2026-07-02T00:10:00.000Z" })
    expect(
      computeWateringStatus([open], new Date("2026-07-02T10:01:00.000Z"))
    ).toMatchObject({ state: "idle" })
  })

  it("skips due checkpoints and counts down to the next scheduled slot", () => {
    const open = { ...baseEvent, weightLogs: [] }

    // At 00:25, 00:10 and 00:20 are due; the countdown skips them for 00:30.
    expect(
      computeNextWatering([open], new Date("2026-07-02T00:25:00.000Z"))
    ).toMatchObject({
      state: "counting",
      nextAt: "2026-07-02T00:30:00.000Z",
      remainingMs: 5 * 60_000,
    })

    expect(
      computeNextWatering([], new Date("2026-07-02T00:25:00.000Z"))
    ).toMatchObject({ state: "idle", nextAt: null })
  })

  it("labels logged, due, upcoming, and skipped slots", () => {
    const slots = weightSlotsForEvent(
      baseEvent,
      new Date("2026-07-02T00:25:00.000Z")
    )

    expect(slots[0]).toMatchObject({ status: "logged" })
    expect(slots[1]).toMatchObject({ status: "due" })
    expect(slots[2]).toMatchObject({ status: "upcoming" })

    const skipped = weightSlotsForEvent(
      { ...baseEvent, weightLogs: [] },
      new Date("2026-07-02T10:01:00.000Z")
    )
    expect(skipped[0]).toMatchObject({ status: "skipped" })
  })

  it("counts completed, due, and skipped weigh schedules", () => {
    const completed = {
      ...baseEvent,
      id: "completed",
      wateredAt: "2026-07-02T09:40:00.000Z",
      cutoffAt: "2026-07-02T10:00:00.000Z",
      weightLogs: [
        {
          slotAt: "2026-07-02T09:50:00.000Z",
          weighedAt: "2026-07-02T09:50:00.000Z",
          massKg: 9,
          note: "",
        },
        {
          slotAt: "2026-07-02T10:00:00.000Z",
          weighedAt: "2026-07-02T10:00:00.000Z",
          massKg: 8.9,
          note: "",
        },
      ],
    }
    const due = { ...baseEvent, id: "due", weightLogs: [] }
    const skipped = {
      ...completed,
      id: "skipped",
      weightLogs: [],
    }

    expect(
      computeWeighCompletion(
        [completed, due, skipped],
        new Date("2026-07-02T10:05:00.000Z")
      )
    ).toMatchObject({ completed: 3, total: 3, due: 0, skipped: 2 })
  })

  it("computes baseline drift, daily water use, and checkpoint change", () => {
    const nextEvent = {
      ...baseEvent,
      id: "event-2",
      wateredAt: "2026-07-03T00:00:00.000Z",
      cutoffAt: "2026-07-03T10:00:00.000Z",
      weightLogs: [
        {
          slotAt: "2026-07-03T00:10:00.000Z",
          weighedAt: "2026-07-03T00:10:00.000Z",
          massKg: 9.5,
          note: "",
        },
        {
          slotAt: "2026-07-03T10:00:00.000Z",
          weighedAt: "2026-07-03T10:00:00.000Z",
          massKg: 8.4,
          note: "",
        },
      ],
    }

    expect(computeBaselineDrift([baseEvent, nextEvent])).toMatchObject({
      slopeKgPerDay: -0.4,
      verdict: "needs_more",
    })
    expect(computeDailyWaterUse([baseEvent, nextEvent])[0]).toMatchObject({
      waterUseKg: 1,
    })
    expect(computeCheckpointDrainage([baseEvent])[0]).toMatchObject({
      drainageKg: 1,
    })
  })
})
