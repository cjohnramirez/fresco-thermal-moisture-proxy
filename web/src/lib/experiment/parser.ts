import { z } from "zod"

import {
  CHANNELS,
  type FirmwarePacket,
  type NormalizedReading,
  type ParsedLineResult,
  type SensorStatus,
} from "./types"

const statusSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z.enum([
      "boot",
      "ok",
      "partial",
      "waiting",
      "no_sensor",
      "read_failed",
      "missing_value",
      "parse_error",
    ])
  )
  .catch("parse_error")

const nullableNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}, z.number().nullable())

const channelSchema = z.object({
  id: z.string().default("surface"),
  pin: nullableNumber.transform((value) => value ?? 4),
  devices: nullableNumber,
  ts: statusSchema,
  tc: nullableNumber,
  tf: nullableNumber,
})

const packetSchema = z.object({
  type: z.literal("temperature").catch("temperature"),
  seq: nullableNumber,
  ms: nullableNumber,
  sensors: nullableNumber,
  ts: statusSchema,
  channels: z.array(channelSchema).default([]),
})

const supabaseTemperatureRowSchema = z.object({
  id: z.union([z.string(), z.number()]),
  created_at: z.string(),
  payload: packetSchema,
})

const fallbackPairPattern =
  /([a-zA-Z_][\w]*)\s*[:=]\s*("[^"]*"|[-+]?\d+(?:\.\d+)?|[a-zA-Z_][\w]*)/g

function fallbackObject(line: string): Record<string, unknown> | null {
  const pairs: Record<string, unknown> = {}
  let match = fallbackPairPattern.exec(line)

  while (match) {
    pairs[match[1]] = match[2].replace(/^"|"$/g, "")
    match = fallbackPairPattern.exec(line)
  }

  if (Object.keys(pairs).length > 0) {
    return pairs
  }

  const onlyNumber = Number(line.trim())
  return Number.isFinite(onlyNumber) ? { tc: onlyNumber, ts: "ok" } : null
}

function channelIdForPin(pin: number, fallback: string) {
  return CHANNELS.find((channel) => channel.pin === pin)?.id ?? fallback
}

function normalizeLegacyPacket(source: Record<string, unknown>) {
  return {
    ...source,
    channels: [
      {
        id: String(source.id ?? source.channel ?? "surface"),
        pin: source.pin ?? 4,
        devices: source.devices ?? source.sensors ?? source.sensorCount ?? null,
        ts: source.ts ?? source.status ?? "ok",
        tc:
          source.tc ??
          source.tempC ??
          source.temperatureC ??
          source.temperature_c ??
          source.celsius ??
          source.temperature ??
          null,
        tf:
          source.tf ??
          source.tempF ??
          source.temperatureF ??
          source.temperature_f ??
          source.fahrenheit ??
          null,
      },
    ],
  }
}

export function parseFirmwareLine(
  line: string,
  sessionId: string,
  receivedAt = new Date().toISOString()
): ParsedLineResult | null {
  const raw = line.trim()
  if (!raw) {
    return null
  }

  let source: unknown

  try {
    source = JSON.parse(raw)
  } catch {
    source = fallbackObject(raw)
  }

  if (!source || typeof source !== "object") {
    return parseError(raw, sessionId, receivedAt, "Line is not valid JSON or key-value data")
  }

  const objectSource = source as Record<string, unknown>
  const packetInput = Array.isArray(objectSource.channels)
    ? objectSource
    : normalizeLegacyPacket(objectSource)
  const parsed = packetSchema.safeParse(packetInput)

  if (!parsed.success) {
    return parseError(raw, sessionId, receivedAt, parsed.error.issues[0]?.message ?? "Packet failed validation")
  }

  const packet = parsed.data as FirmwarePacket
  const packetReceivedAt =
    typeof objectSource.receivedAt === "string" ? objectSource.receivedAt : receivedAt
  const readings = packet.channels.map((channel, index) => {
    const celsius = channel.tc
    const fahrenheit = channel.tf ?? (celsius === null ? null : celsius * 1.8 + 32)
    const knownChannel = CHANNELS[index]
    const channelId = channelIdForPin(channel.pin, channel.id || knownChannel?.id || `ch-${index + 1}`)

    return {
      id: `${sessionId}:${packet.seq ?? "na"}:${channelId}:${packetReceivedAt}`,
      sessionId,
      receivedAt: packetReceivedAt,
      seq: packet.seq,
      deviceMs: packet.ms,
      channelId,
      pin: channel.pin,
      devices: channel.devices,
      status: channel.ts,
      celsius,
      fahrenheit,
      raw,
    } satisfies NormalizedReading
  })

  return { ok: true, packet, readings }
}

export function normalizeSupabaseRows(rows: unknown[], sessionId: string) {
  return rows
    .flatMap((row) => {
      const parsed = supabaseTemperatureRowSchema.safeParse(row)
      if (!parsed.success) {
        return []
      }

      const source = parsed.data
      const packet = source.payload as FirmwarePacket
      const raw = JSON.stringify(packet)

      return packet.channels.map((channel, index) => {
        const celsius = channel.tc
        const fahrenheit = channel.tf ?? (celsius === null ? null : celsius * 1.8 + 32)
        const knownChannel = CHANNELS[index]
        const channelId = channelIdForPin(
          channel.pin,
          channel.id || knownChannel?.id || `ch-${index + 1}`
        )

        return {
          id: `${sessionId}:${source.id}:${channelId}`,
          sessionId,
          receivedAt: source.created_at,
          seq: packet.seq,
          deviceMs: packet.ms,
          channelId,
          pin: channel.pin,
          devices: channel.devices,
          status: channel.ts,
          celsius,
          fahrenheit,
          raw,
        } satisfies NormalizedReading
      })
    })
    .sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt))
}

function parseError(
  raw: string,
  sessionId: string,
  receivedAt: string,
  error: string
): ParsedLineResult {
  return {
    ok: false,
    error,
    raw,
    readings: [
      {
        id: `${sessionId}:parse-error:${receivedAt}`,
        sessionId,
        receivedAt,
        seq: null,
        deviceMs: null,
        channelId: "parse_error",
        pin: -1,
        devices: null,
        status: "parse_error" as SensorStatus,
        celsius: null,
        fahrenheit: null,
        raw,
      },
    ],
  }
}

export function parseFirmwareText(text: string, sessionId: string) {
  return text
    .split(/\r?\n/)
    .flatMap((line) => {
      const result = parseFirmwareLine(line, sessionId)
      return result ? [result] : []
    })
}
