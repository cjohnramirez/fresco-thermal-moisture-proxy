import { z } from "zod"

import type {
  BaselineDrift,
  BucketSize,
  ChartRange,
  DailyWaterUse,
  FirstHourDrainage,
  IrrigationEvent,
  WateringStatus,
  WeighCompletion,
} from "./types"

export const DEFAULT_BAG_ID = "bag-1"
export const MANILA_TIME_ZONE = "Asia/Manila"
export const DEFAULT_WATER_L = 2
export const DEFAULT_CHART_RANGE: ChartRange = "1d"
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

const optionalMass = numberish.refine(
  (value) => value === null || (value >= 0.5 && value <= 20),
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

export const createIrrigationEventSchema = z.object({
  bagId: bagIdField.default(DEFAULT_BAG_ID),
  wateredAt: isoTimestamp,
  waterL: waterLField.default(DEFAULT_WATER_L),
  waterTempC: optionalWaterTemp.default(null),
  preMassKg: optionalMass.default(null),
  postMassKg: optionalMass.default(null),
  drainedMassKg: optionalMass.default(null),
  drainedAt: isoTimestamp.nullable().default(null),
  note: noteField.default(""),
})

export const updateIrrigationEventSchema = z.object({
  bagId: bagIdField.optional(),
  wateredAt: isoTimestamp.optional(),
  waterL: waterLField.optional(),
  waterTempC: optionalWaterTemp.optional(),
  preMassKg: optionalMass.optional(),
  postMassKg: optionalMass.optional(),
  drainedMassKg: optionalMass.optional(),
  drainedAt: isoTimestamp.nullable().optional(),
  note: noteField.optional(),
  archivedAt: isoTimestamp.nullable().optional(),
})

export const logWeightSchema = z.object({
  drainedMassKg: optionalMass.refine((value) => value !== null, "Weight is required."),
  drainedAt: isoTimestamp.default(() => new Date().toISOString()),
})

export type CreateIrrigationEventInput = z.infer<
  typeof createIrrigationEventSchema
>
export type UpdateIrrigationEventInput = z.infer<
  typeof updateIrrigationEventSchema
>

export type SupabaseIrrigationEventRow = {
  id: number | string
  bag_id: string
  watered_at: string
  water_l: number | string
  water_temp_c: number | string | null
  pre_mass_kg: number | string | null
  post_mass_kg: number | string | null
  drained_mass_kg: number | string | null
  drained_at: string | null
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

export function normalizeIrrigationEventRow(
  row: SupabaseIrrigationEventRow
): IrrigationEvent {
  return {
    id: String(row.id),
    bagId: row.bag_id,
    wateredAt: row.watered_at,
    waterL: nullableNumber(row.water_l) ?? DEFAULT_WATER_L,
    waterTempC: nullableNumber(row.water_temp_c),
    preMassKg: nullableNumber(row.pre_mass_kg),
    postMassKg: nullableNumber(row.post_mass_kg),
    drainedMassKg: nullableNumber(row.drained_mass_kg),
    drainedAt: row.drained_at,
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
    ...(input.waterL !== undefined ? { water_l: input.waterL } : {}),
    ...(input.waterTempC !== undefined ? { water_temp_c: input.waterTempC } : {}),
    ...(input.preMassKg !== undefined ? { pre_mass_kg: input.preMassKg } : {}),
    ...(input.postMassKg !== undefined ? { post_mass_kg: input.postMassKg } : {}),
    ...(input.drainedMassKg !== undefined
      ? { drained_mass_kg: input.drainedMassKg }
      : {}),
    ...(input.drainedAt !== undefined ? { drained_at: input.drainedAt } : {}),
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

export function computeWateringStatus(
  events: IrrigationEvent[],
  now = new Date()
): WateringStatus {
  const openEvent =
    activeIrrigationEvents(events)
      .filter((event) => event.drainedMassKg === null)
      .toSorted(
        (a, b) => Date.parse(b.wateredAt) - Date.parse(a.wateredAt)
      )[0] ?? null

  if (!openEvent) {
    return {
      state: "idle",
      event: null,
      dueAt: null,
      remainingMs: 0,
      overdueMs: 0,
    }
  }

  const dueTime = Date.parse(openEvent.wateredAt) + 60 * 60_000
  const dueAt = new Date(dueTime).toISOString()
  const remainingMs = Math.max(0, dueTime - now.getTime())
  const overdueMs = Math.max(0, now.getTime() - dueTime)
  const state =
    now.getTime() < dueTime
      ? "counting"
      : overdueMs >= 60 * 60_000
        ? "overdue"
        : "due"

  return { state, event: openEvent, dueAt, remainingMs, overdueMs }
}

export function computeWeighCompletion(
  events: IrrigationEvent[],
  now = new Date()
): WeighCompletion {
  const active = activeIrrigationEvents(events)
  const completed = active.filter((event) => event.drainedMassKg !== null).length
  const open = active.filter((event) => event.drainedMassKg === null)
  let due = 0
  let overdue = 0

  for (const event of open) {
    const dueTime = Date.parse(event.wateredAt) + 60 * 60_000
    if (now.getTime() >= dueTime) {
      due += 1
    }
    if (now.getTime() - dueTime >= 60 * 60_000) {
      overdue += 1
    }
  }

  return {
    completed,
    total: active.length,
    due,
    overdue,
    percent: active.length ? Math.round((completed / active.length) * 100) : 0,
  }
}

export function computeBaselineDrift(events: IrrigationEvent[]): BaselineDrift {
  const points = activeIrrigationEvents(events)
    .filter((event) => event.drainedMassKg !== null)
    .toSorted((a, b) => Date.parse(a.wateredAt) - Date.parse(b.wateredAt))
    .map((event) => ({
      day: formatManilaDay(event.wateredAt),
      wateredAt: event.wateredAt,
      preMassKg: event.preMassKg,
      drainedMassKg: event.drainedMassKg ?? 0,
    }))

  if (points.length < 2) {
    return { points, slopeKgPerDay: null, verdict: "insufficient" }
  }

  const start = Date.parse(points[0].wateredAt)
  const pairs = points.map((point) => ({
    x: (Date.parse(point.wateredAt) - start) / 86_400_000,
    y: point.drainedMassKg,
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
  const active = activeIrrigationEvents(events).toSorted(
    (a, b) => Date.parse(a.wateredAt) - Date.parse(b.wateredAt)
  )
  const rows: DailyWaterUse[] = []

  for (let index = 0; index < active.length - 1; index += 1) {
    const event = active[index]
    const nextEvent = active[index + 1]
    if (event.drainedMassKg === null || nextEvent.preMassKg === null) {
      continue
    }

    rows.push({
      day: formatManilaDay(nextEvent.wateredAt),
      fromWateredAt: event.wateredAt,
      toWateredAt: nextEvent.wateredAt,
      waterUseKg: Number((event.drainedMassKg - nextEvent.preMassKg).toFixed(3)),
    })
  }

  return rows
}

export function computeFirstHourDrainage(
  events: IrrigationEvent[]
): FirstHourDrainage[] {
  return activeIrrigationEvents(events)
    .filter(
      (event) => event.postMassKg !== null && event.drainedMassKg !== null
    )
    .toSorted((a, b) => Date.parse(a.wateredAt) - Date.parse(b.wateredAt))
    .map((event) => ({
      day: formatManilaDay(event.wateredAt),
      wateredAt: event.wateredAt,
      drainageKg: Number(
        ((event.postMassKg ?? 0) - (event.drainedMassKg ?? 0)).toFixed(3)
      ),
    }))
}

export function lateWeighLabel(event: IrrigationEvent) {
  if (!event.drainedAt) {
    return null
  }

  const minutes =
    (Date.parse(event.drainedAt) - Date.parse(event.wateredAt)) / 60_000
  if (minutes < 45) {
    return "early"
  }
  if (minutes > 90) {
    return "late"
  }
  return null
}

export function bucketStart(value: string | Date, bucket: BucketSize) {
  const timestamp = new Date(value).getTime()
  const size = BUCKET_MS[bucket]
  return Math.floor(timestamp / size) * size
}

export function bucketTimeLabel(value: string | Date, bucket: BucketSize) {
  const start = new Date(bucketStart(value, bucket))
  return bucket === "1d" ? formatManilaDay(start) : formatManilaTime(start)
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
