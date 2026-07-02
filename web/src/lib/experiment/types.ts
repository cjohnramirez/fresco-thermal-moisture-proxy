export const CHANNELS = [
  { id: "control", label: "Control", pin: 5 },
  { id: "surface", label: "Surface", pin: 4 },
  { id: "roots", label: "Root zone", pin: 16 },
  { id: "bottom", label: "Bottom", pin: 17 },
] as const

export type ChannelId = (typeof CHANNELS)[number]["id"]

export type SensorStatus =
  | "boot"
  | "ok"
  | "partial"
  | "waiting"
  | "no_sensor"
  | "read_failed"
  | "missing_value"
  | "parse_error"

export type FirmwareChannel = {
  id: string
  pin: number
  devices: number | null
  ts: SensorStatus
  tc: number | null
  tf: number | null
}

export type FirmwarePacket = {
  type: "temperature"
  seq: number | null
  ms: number | null
  sensors: number | null
  ts: SensorStatus
  channels: FirmwareChannel[]
}

export type SupabaseTemperatureRow = {
  id: number | string
  created_at: string
  payload: FirmwarePacket
}

export type NormalizedReading = {
  id: string
  sessionId: string
  receivedAt: string
  seq: number | null
  deviceMs: number | null
  channelId: ChannelId | string
  pin: number
  devices: number | null
  status: SensorStatus
  celsius: number | null
  fahrenheit: number | null
  raw: string
}

export type IrrigationEvent = {
  id: string
  bagId: string
  wateredAt: string
  waterL: number
  waterTempC: number | null
  preMassKg: number | null
  postMassKg: number | null
  drainedMassKg: number | null
  drainedAt: string | null
  note: string
  createdAt: string
  archivedAt: string | null
}

export type BucketSize = "1m" | "10m" | "30m" | "1h" | "1d"

export type ChartRange = "1h" | "1d" | "1w"

export type WateringStatus =
  | {
      state: "idle"
      event: null
      dueAt: null
      remainingMs: 0
      overdueMs: 0
    }
  | {
      state: "counting" | "due" | "overdue"
      event: IrrigationEvent
      dueAt: string
      remainingMs: number
      overdueMs: number
    }

export type BaselineVerdict = "needs_more" | "too_much" | "matched" | "insufficient"

export type BaselineDrift = {
  points: Array<{
    day: string
    wateredAt: string
    preMassKg: number | null
    drainedMassKg: number
  }>
  slopeKgPerDay: number | null
  verdict: BaselineVerdict
}

export type DailyWaterUse = {
  day: string
  fromWateredAt: string
  toWateredAt: string
  waterUseKg: number
}

export type FirstHourDrainage = {
  day: string
  wateredAt: string
  drainageKg: number
}

export type WateringRecovery = {
  event: string
  wateredAt: string
  samples: number
  delta: number | null
}

export type WeighCompletion = {
  completed: number
  total: number
  due: number
  overdue: number
  percent: number
}

export type ExperimentSummary = {
  ok: true
  bucket: BucketSize
  rowCount: number
  readingCount: number
  generatedAt: string
  temperatureSeries: Array<Record<string, number | string | null>>
  gradientData: Array<Record<string, number | string | null>>
  swingData: Array<{
    day: string
    swing: number
    min: number
    max: number
  }>
  irrigationMarkers: Array<{
    time: string
    wateredAt: string
    label: string
  }>
  baseline: BaselineDrift
  dailyWaterUse: DailyWaterUse[]
  firstHourDrainage: FirstHourDrainage[]
  wateringRecovery: WateringRecovery[]
  weighCompletion: WeighCompletion
  temperatureStats: {
    min: number | null
    max: number | null
  }
  message?: string
}

export type WeekAnalysisResult = ExperimentSummary & {
  from: string
  to: string
  fullResolution: true
}

export type SyncState = {
  queued: number
  synced: number
  failed: number
  message: string
}

export type ParsedLineResult =
  | {
      ok: true
      packet: FirmwarePacket
      readings: NormalizedReading[]
    }
  | {
      ok: false
      error: string
      raw: string
      readings: NormalizedReading[]
    }
