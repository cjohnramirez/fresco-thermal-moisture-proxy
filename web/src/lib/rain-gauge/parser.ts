import { z } from "zod"

import type {
  RainGaugeReading,
  RainGaugeReadingPacket,
  RainGaugeStatusPacket,
} from "./types"

const nullableNumber = z.number().finite().nullable()

export const rainGaugeReadingSchema = z.object({
  type: z.literal("rain_gauge"),
  seq: z.number().int().nonnegative(),
  ms: z.number().int().nonnegative(),
  edges: z.number().int().nonnegative(),
  tips: z.number().finite().nonnegative(),
  lastEdgeMs: z.number().int().nonnegative(),
  rainfallMl: z.number().finite().nonnegative(),
  rainfallMm: nullableNumber,
  rateMlPerMin: z.number().finite().nonnegative(),
  rateMmPerHr: nullableNumber,
})

export const rainGaugeStatusSchema = z.object({
  type: z.literal("rain_gauge").optional(),
  device: z.string().min(1),
  uptimeMs: z.number().int().nonnegative(),
  sessionStartMs: z.number().int().nonnegative(),
  ssid: z.string(),
  ip: z.string(),
  clients: z.number().int().nonnegative(),
  sseClients: z.number().int().nonnegative(),
  tipPin: z.number().int().nonnegative(),
  debounceMs: z.number().int().nonnegative(),
  countsBothEdges: z.boolean(),
  mlPerTip: z.number().finite().positive(),
  catchmentAreaCm2: nullableNumber,
  mmPerTip: nullableNumber,
  edges: z.number().int().nonnegative(),
  tips: z.number().finite().nonnegative(),
})

export function parseRainGaugeReading(value: unknown): RainGaugeReadingPacket {
  return rainGaugeReadingSchema.parse(value)
}

export function parseRainGaugeStatus(value: unknown): RainGaugeStatusPacket {
  return rainGaugeStatusSchema.parse(value)
}

export function parseRainGaugeReadingJson(raw: string): RainGaugeReadingPacket {
  return parseRainGaugeReading(JSON.parse(raw))
}

export function normalizeRainGaugeReading({
  packet,
  raw,
  receivedAt = new Date().toISOString(),
  sessionId,
  source = "ap",
}: {
  packet: RainGaugeReadingPacket
  raw?: string
  receivedAt?: string
  sessionId: string
  source?: RainGaugeReading["source"]
}): RainGaugeReading {
  return {
    ...packet,
    id: `${sessionId}-${packet.seq}-${packet.ms}-${packet.edges}`,
    sessionId,
    receivedAt,
    source,
    raw: raw ?? JSON.stringify(packet),
  }
}

export function isPendingHalfTip(reading: Pick<RainGaugeReadingPacket, "edges"> | null) {
  return Boolean(reading && reading.edges % 2 === 1)
}
