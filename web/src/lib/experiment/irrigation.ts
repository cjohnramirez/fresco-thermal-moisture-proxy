import { z } from "zod"

import type {
  BaselineDrift,
  BucketSize,
  ChartRange,
  CheckpointDrainage,
  DailyWaterUse,
  IrrigationEvent,
  IrrigationWeightLog,
  IrrigationWeightSlot,
  WateringStatus,
  WeighCompletion,
} from "./types"

export const DEFAULT_BAG_ID = "bag-1"
export const MANILA_TIME_ZONE = "Asia/Manila"
export const DEFAULT_WATER_L = 2
export const DEFAULT_CHART_RANGE: ChartRange = "1d"
export const WEIGH_WINDOW_MS = 10 * 60_000
export const MANILA_CUTOFF_HOUR = 18
export const CHART_RANGES = ["1h", "1d", "1w"] as const
export const BUCKET_SIZES = ["1m", "10m", "30m", "1h", "1d"] as const
export const BUCKET_MS: Record<BucketSize, number> = {
  "1m": 60_000,
  "10m": 10 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
}

export const CHART_RANGE_CONFIG: Record<
  ChartRange,
  { bucket: BucketSize; durationMs: number }
> = {
  "1h": { bucket: "1m", durationMs: 60 * 60_000 },
  "1d": { bucket: "10m", durationMs: 24 * 60 * 60_000 },
  "1w": { bucket: "1h", durationMs: 7 * 24 * 60 * 60_000 },
}

export function isChartRange(value: unknown): value is ChartRange {
  return CHART_RANGES.includes(value as ChartRange)
}

export function bucketForChartRange(range: ChartRange) {
  return CHART_RANGE_CONFIG[range].bucket
}

export function durationForChartRange(range: ChartRange) {
  return CHART_RANGE_CONFIG[range].durationMs
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: MANILA_TIME_ZONE,
})

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: MANILA_TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: MANILA_TIME_ZONE,
})

// Compact date + time (e.g. "Jul 3, 14:00") for buckets that span multiple days,
// so points on different days keep distinct axis labels and tooltips.
const dayTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: MANILA_TIME_ZONE,
})

const localInputFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: MANILA_TIME_ZONE,
})

const numberish = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : value
}, z.number().nullable())

const requiredMass = numberish.refine(
  (value): value is number => value !== null && value >= 0.5 && value <= 20,
  "Mass must be between 0.5 kg and 20 kg."
)

const optionalWaterTemp = numberish.refine(
  (value) => value === null || (value >= 0 && value <= 60),
  "Water temperature must be between 0 C and 60 C."
)

const isoTimestamp = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime({ offset: false }))
  .transform((value) => new Date(value).toISOString())

const bagIdField = z.string().trim().min(1)
const waterLField = z.coerce.number().positive().max(99.99)
const noteField = z.string().trim().max(1000)

export const weightLogSchema = z.object({
  slotAt: isoTimestamp,
  weighedAt: isoTimestamp,
  massKg: requiredMass,
  note: noteField.default(""),
})

const weightLogsSchema = z.array(weightLogSchema).default([])

export const createIrrigationEventSchema = z.object({
  bagId: bagIdField.default(DEFAULT_BAG_ID),
  wateredAt: isoTimestamp,
  waterL: waterLField.default(DEFAULT_WATER_L),
  waterTempC: optionalWaterTemp.default(null),
  weightLogs: weightLogsSchema,
  note: noteField.default(""),
})

export const updateIrrigationEventSchema = z.object({
  bagId: bagIdField.optional(),
  wateredAt: isoTimestamp.optional(),
  cutoffAt: isoTimestamp.optional(),
  waterL: waterLField.optional(),
  waterTempC: optionalWaterTemp.optional(),
  weightLogs: z.array(weightLogSchema).optional(),
  weightLog: weightLogSchema.optional(),
  note: noteField.optional(),
  archivedAt: isoTimestamp.nullable().optional(),
})

export const logWeightSchema = z.object({
  weightLog: weightLogSchema,
})

export type CreateIrrigationEventInput = z.infer<
  typeof createIrrigationEventSchema
>
export type UpdateIrrigationEventInput = z.infer<
  typeof updateIrrigationEventSchema
>

// Canonical column list for irrigation_events reads. Shared so the API routes
// and server fetch cannot drift into different (or stale legacy) column sets.
export const IRRIGATION_EVENT_SELECT =
  "id,bag_id,watered_at,cutoff_at,water_l,water_temp_c,weight_logs,note,created_at,archived_at"

export type SupabaseIrrigationEventRow = {
  id: number | string
  bag_id: string
  watered_at: string
  cutoff_at?: string | null
  water_l: number | string
  water_temp_c: number | string | null
  weight_logs: unknown
  note: string | null
  created_at: string
  archived_at?: string | null
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function manilaDateParts(value: string | Date) {
  return Object.fromEntries(
    dayFormatter
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value])
  )
}

export function cutoffAtForWatering(value: string | Date) {
  const parts = manilaDateParts(value)
  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${String(
      MANILA_CUTOFF_HOUR
    ).padStart(2, "0")}:00:00+08:00`
  ).toISOString()
}

export function isBeforeWateringCutoff(value: string | Date) {
  return new Date(value).getTime() < Date.parse(cutoffAtForWatering(value))
}

function sortWeightLogs(logs: IrrigationWeightLog[]) {
  return logs.toSorted((a, b) => Date.parse(a.slotAt) - Date.parse(b.slotAt))
}

function dedupeWeightLogs(logs: IrrigationWeightLog[]) {
  const bySlot = new Map<string, IrrigationWeightLog>()

  for (const log of sortWeightLogs(logs)) {
    bySlot.set(log.slotAt, log)
  }

  return sortWeightLogs(Array.from(bySlot.values()))
}

export function normalizeWeightLogs(value: unknown): IrrigationWeightLog[] {
  const parsed = z.array(weightLogSchema).safeParse(
    Array.isArray(value) ? value : []
  )

  return parsed.success ? dedupeWeightLogs(parsed.data) : []
}

export function normalizeIrrigationEventRow(
  row: SupabaseIrrigationEventRow
): IrrigationEvent {
  return {
    id: String(row.id),
    bagId: row.bag_id,
    wateredAt: row.watered_at,
    cutoffAt: row.cutoff_at ?? cutoffAtForWatering(row.watered_at),
    waterL: nullableNumber(row.water_l) ?? DEFAULT_WATER_L,
    waterTempC: nullableNumber(row.water_temp_c),
    weightLogs: normalizeWeightLogs(row.weight_logs),
    note: row.note ?? "",
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? null,
  }
}

export function toSupabaseIrrigationPayload(
  input: CreateIrrigationEventInput | UpdateIrrigationEventInput
) {
  return {
    ...(input.bagId !== undefined ? { bag_id: input.bagId } : {}),
    ...(input.wateredAt !== undefined ? { watered_at: input.wateredAt } : {}),
    ...("cutoffAt" in input && input.cutoffAt !== undefined
      ? { cutoff_at: input.cutoffAt }
      : {}),
    ...(input.waterL !== undefined ? { water_l: input.waterL } : {}),
    ...(input.waterTempC !== undefined ? { water_temp_c: input.waterTempC } : {}),
    ...(input.weightLogs !== undefined ? { weight_logs: input.weightLogs } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    ...("archivedAt" in input && input.archivedAt !== undefined
      ? { archived_at: input.archivedAt }
      : {}),
  }
}

export function formatManilaDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value))
}

export function formatManilaDay(value: string | Date) {
  return dayFormatter.format(new Date(value))
}

export function formatManilaTime(value: string | Date) {
  return timeFormatter.format(new Date(value))
}

export function formatManilaDayTime(value: string | Date) {
  return dayTimeFormatter.format(new Date(value))
}

export function toManilaDatetimeLocalValue(value: string | Date) {
  const parts = Object.fromEntries(
    localInputFormatter
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function manilaLocalInputToIso(value: string) {
  return new Date(`${value}:00+08:00`).toISOString()
}

export function defaultWateredAtLocalValue(now = new Date()) {
  return toManilaDatetimeLocalValue(now)
}

export function activeIrrigationEvents(events: IrrigationEvent[]) {
  return events.filter((event) => event.archivedAt === null)
}

export function expectedWeightSlots(
  event: Pick<IrrigationEvent, "cutoffAt" | "wateredAt">
) {
  const slots: string[] = []
  let cursor = Date.parse(event.wateredAt) + WEIGH_WINDOW_MS
  const cutoff = Date.parse(event.cutoffAt)

  if (!Number.isFinite(cursor) || !Number.isFinite(cutoff) || cursor >= cutoff) {
    return slots
  }

  while (cursor <= cutoff && slots.length < 200) {
    slots.push(new Date(cursor).toISOString())
    cursor += WEIGH_WINDOW_MS
  }

  return slots
}

export function weightLogMap(event: IrrigationEvent) {
  return new Map(event.weightLogs.map((log) => [log.slotAt, log]))
}

export function weightSlotsForEvent(event: IrrigationEvent, now = new Date()) {
  const logs = weightLogMap(event)
  const nowTime = now.getTime()
  const cutoffTime = Date.parse(event.cutoffAt)

  return expectedWeightSlots(event).map<IrrigationWeightSlot>((slotAt) => {
    const weightLog = logs.get(slotAt) ?? null
    if (weightLog) {
      return { slotAt, status: "logged", weightLog }
    }

    if (nowTime >= cutoffTime) {
      return { slotAt, status: "skipped", weightLog: null }
    }

    if (Date.parse(slotAt) <= nowTime) {
      return { slotAt, status: "due", weightLog: null }
    }

    return { slotAt, status: "upcoming", weightLog: null }
  })
}

export function weightSlotSummary(event: IrrigationEvent, now = new Date()) {
  const slots = weightSlotsForEvent(event, now)

  return {
    dueCount: slots.filter((slot) => slot.status === "due").length,
    skippedCount: slots.filter((slot) => slot.status === "skipped").length,
    totalSlots: slots.length,
    upcomingCount: slots.filter((slot) => slot.status === "upcoming").length,
    weighedCount: slots.filter((slot) => slot.status === "logged").length,
  }
}

export function firstWeightLog(event: IrrigationEvent) {
  return sortWeightLogs(event.weightLogs)[0] ?? null
}

export function latestWeightLog(event: IrrigationEvent) {
  const logs = sortWeightLogs(event.weightLogs)
  return logs[logs.length - 1] ?? null
}

export function mergeWeightLog(
  event: IrrigationEvent,
  weightLog: IrrigationWeightLog
) {
  const expectedSlots = new Set(expectedWeightSlots(event))

  if (!expectedSlots.has(weightLog.slotAt)) {
    throw new Error("Selected slot does not belong to this watering schedule.")
  }

  return dedupeWeightLogs([...event.weightLogs, weightLog])
}

function activeWeighEvent(events: IrrigationEvent[], now = new Date()) {
  const nowTime = now.getTime()

  return (
    activeIrrigationEvents(events)
      .filter((event) => Date.parse(event.cutoffAt) > nowTime)
      .toSorted((a, b) => Date.parse(b.wateredAt) - Date.parse(a.wateredAt))[0] ??
    null
  )
}

export function computeWateringStatus(
  events: IrrigationEvent[],
  now = new Date()
): WateringStatus {
  const event = activeWeighEvent(events, now)

  if (!event) {
    return {
      state: "idle",
      event: null,
      cutoffAt: null,
      dueSlotAt: null,
      nextSlotAt: null,
      remainingMs: 0,
      skippedCount: 0,
      totalSlots: 0,
      weighedCount: 0,
    }
  }

  const slots = weightSlotsForEvent(event, now)
  const dueSlotAt = slots.find((slot) => slot.status === "due")?.slotAt ?? null
  const nextSlotAt =
    slots.find((slot) => slot.status === "upcoming")?.slotAt ?? null
  const summary = weightSlotSummary(event, now)
  const countdownTarget = dueSlotAt ?? nextSlotAt ?? event.cutoffAt

  return {
    state: dueSlotAt ? "due" : "counting",
    event,
    cutoffAt: event.cutoffAt,
    dueSlotAt,
    nextSlotAt,
    remainingMs: Math.max(0, Date.parse(countdownTarget) - now.getTime()),
    skippedCount: summary.skippedCount,
    totalSlots: summary.totalSlots,
    weighedCount: summary.weighedCount,
  }
}

export function computeWeighCompletion(
  events: IrrigationEvent[],
  now = new Date()
): WeighCompletion {
  const active = activeIrrigationEvents(events)
  let completed = 0
  let due = 0
  let skipped = 0

  for (const event of active) {
    const summary = weightSlotSummary(event, now)
    if (now.getTime() >= Date.parse(event.cutoffAt)) {
      completed += 1
      if (summary.skippedCount > 0) {
        skipped += 1
      }
    } else if (summary.dueCount > 0) {
      due += 1
    }
  }

  return {
    completed,
    total: active.length,
    due,
    skipped,
    percent: active.length ? Math.round((completed / active.length) * 100) : 0,
  }
}

export function computeBaselineDrift(events: IrrigationEvent[]): BaselineDrift {
  const points = activeIrrigationEvents(events)
    .flatMap((event) => {
      const final = latestWeightLog(event)
      if (!final) {
        return []
      }

      return [
        {
          day: formatManilaDay(event.wateredAt),
          wateredAt: event.wateredAt,
          initialMassKg: firstWeightLog(event)?.massKg ?? null,
          finalMassKg: final.massKg,
        },
      ]
    })
    .toSorted((a, b) => Date.parse(a.wateredAt) - Date.parse(b.wateredAt))

  if (points.length < 2) {
    return { points, slopeKgPerDay: null, verdict: "insufficient" }
  }

  const start = Date.parse(points[0].wateredAt)
  const pairs = points.map((point) => ({
    x: (Date.parse(point.wateredAt) - start) / 86_400_000,
    y: point.finalMassKg,
  }))
  const xMean = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length
  const yMean = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length
  let numerator = 0
  let denominator = 0

  for (const pair of pairs) {
    numerator += (pair.x - xMean) * (pair.y - yMean)
    denominator += (pair.x - xMean) ** 2
  }

  const slope = denominator === 0 ? 0 : numerator / denominator
  const slopeKgPerDay = Number(slope.toFixed(3))
  const verdict =
    Math.abs(slopeKgPerDay) < 0.05
      ? "matched"
      : slopeKgPerDay < 0
        ? "needs_more"
        : "too_much"

  return { points, slopeKgPerDay, verdict }
}

export function computeDailyWaterUse(events: IrrigationEvent[]): DailyWaterUse[] {
  return activeIrrigationEvents(events)
    .flatMap((event) => {
      const first = firstWeightLog(event)
      const latest = latestWeightLog(event)
      if (!first || !latest || first.slotAt === latest.slotAt) {
        return []
      }

      return [
        {
          day: formatManilaDay(event.wateredAt),
          fromWateredAt: first.slotAt,
          toWateredAt: latest.slotAt,
          waterUseKg: Number((first.massKg - latest.massKg).toFixed(3)),
        },
      ]
    })
    .toSorted((a, b) => Date.parse(a.fromWateredAt) - Date.parse(b.fromWateredAt))
}

export function computeCheckpointDrainage(
  events: IrrigationEvent[]
): CheckpointDrainage[] {
  return activeIrrigationEvents(events)
    .flatMap((event) => {
      const first = firstWeightLog(event)
      const latest = latestWeightLog(event)
      if (!first || !latest || first.slotAt === latest.slotAt) {
        return []
      }

      return [
        {
          day: formatManilaDay(event.wateredAt),
          wateredAt: event.wateredAt,
          drainageKg: Number((first.massKg - latest.massKg).toFixed(3)),
        },
      ]
    })
    .toSorted((a, b) => Date.parse(a.wateredAt) - Date.parse(b.wateredAt))
}

export function bucketStart(value: string | Date, bucket: BucketSize) {
  const timestamp = new Date(value).getTime()
  const size = BUCKET_MS[bucket]
  return Math.floor(timestamp / size) * size
}

export function bucketTimeLabel(value: string | Date, bucket: BucketSize) {
  const start = new Date(bucketStart(value, bucket))
  if (bucket === "1d") {
    return formatManilaDay(start)
  }
  // The hourly bucket backs the 1-week range, which spans multiple days; include
  // the date so 7 days of points don't collapse onto 24 shared HH:mm labels.
  if (bucket === "1h") {
    return formatManilaDayTime(start)
  }
  return formatManilaTime(start)
}

export function eventMarkers(events: IrrigationEvent[], bucket: BucketSize) {
  return activeIrrigationEvents(events).map((event) => ({
    time: bucketTimeLabel(event.wateredAt, bucket),
    wateredAt: event.wateredAt,
    label: `${event.waterL.toFixed(2)} L`,
  }))
}

export function baselineVerdictLabel(verdict: BaselineDrift["verdict"]) {
  if (verdict === "needs_more") return "Needs More (kailangan)"
  if (verdict === "too_much") return "Too Much (dili)"
  if (verdict === "matched") return "Matched"
  return "Need More Weighs"
}
