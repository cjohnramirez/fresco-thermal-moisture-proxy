import type {
  IrrigationEvent,
  SupabaseTemperatureRow,
} from "./types"
import { cutoffAtForWatering, WEIGH_WINDOW_MS } from "./irrigation"

const now = Date.now()

const samples = [
  {
    seq: 1,
    offset: -90,
    control: 27.8,
    surface: 28.8,
    roots: 27.9,
    bottom: 27.2,
  },
  {
    seq: 2,
    offset: -60,
    control: 28.1,
    surface: 29.4,
    roots: 28.2,
    bottom: 27.4,
  },
  {
    seq: 3,
    offset: -30,
    control: 27.7,
    surface: 28.2,
    roots: 27.7,
    bottom: 27.3,
  },
  {
    seq: 4,
    offset: -10,
    control: 27.4,
    surface: 27.6,
    roots: 27.4,
    bottom: 27.2,
  },
  {
    seq: 5,
    offset: 0,
    control: 27.5,
    surface: 27.9,
    roots: 27.5,
    bottom: 27.2,
  },
]

export const sampleSupabaseRows: SupabaseTemperatureRow[] = samples.map((row) => ({
  id: row.seq,
  created_at: new Date(now + row.offset * 60_000).toISOString(),
  payload: {
    type: "temperature",
    seq: row.seq,
    ms: row.seq * 1000,
    sensors: 4,
    ts: "ok",
    channels: [
      { id: "control", pin: 5, devices: 1, ts: "ok", tc: row.control, tf: row.control * 1.8 + 32 },
      { id: "surface", pin: 4, devices: 1, ts: "ok", tc: row.surface, tf: row.surface * 1.8 + 32 },
      { id: "roots", pin: 16, devices: 1, ts: "ok", tc: row.roots, tf: row.roots * 1.8 + 32 },
      { id: "bottom", pin: 17, devices: 1, ts: "ok", tc: row.bottom, tf: row.bottom * 1.8 + 32 },
    ],
  },
}))

export const sampleLines = sampleSupabaseRows.map((row) =>
  JSON.stringify({ ...row.payload, receivedAt: row.created_at })
)

function sampleWeightLogs(wateredAt: string, masses: number[]) {
  return masses.map((massKg, index) => {
    const slotAt = new Date(
      Date.parse(wateredAt) + (index + 1) * WEIGH_WINDOW_MS
    ).toISOString()

    return { slotAt, weighedAt: slotAt, massKg, note: "" }
  })
}

export const sampleIrrigationEvents: IrrigationEvent[] = [
  {
    id: "sample-1",
    bagId: "bag-1",
    wateredAt: new Date(now - 6 * 24 * 60 * 60_000).toISOString(),
    cutoffAt: cutoffAtForWatering(new Date(now - 6 * 24 * 60 * 60_000)),
    waterL: 2,
    waterTempC: 25.2,
    weightLogs: sampleWeightLogs(
      new Date(now - 6 * 24 * 60 * 60_000).toISOString(),
      [9.18, 9.02, 8.91, 8.82]
    ),
    note: "Sample watering.",
    createdAt: new Date(now - 6 * 24 * 60 * 60_000).toISOString(),
    archivedAt: null,
  },
  {
    id: "sample-2",
    bagId: "bag-1",
    wateredAt: new Date(now - 5 * 24 * 60 * 60_000).toISOString(),
    cutoffAt: cutoffAtForWatering(new Date(now - 5 * 24 * 60 * 60_000)),
    waterL: 2,
    waterTempC: 25,
    weightLogs: sampleWeightLogs(
      new Date(now - 5 * 24 * 60 * 60_000).toISOString(),
      [9.55, 9.31, 9.02, 8.86]
    ),
    note: "Sample watering.",
    createdAt: new Date(now - 5 * 24 * 60 * 60_000).toISOString(),
    archivedAt: null,
  },
  {
    id: "sample-3",
    bagId: "bag-1",
    wateredAt: new Date(now - 4 * 24 * 60 * 60_000).toISOString(),
    cutoffAt: cutoffAtForWatering(new Date(now - 4 * 24 * 60 * 60_000)),
    waterL: 2,
    waterTempC: null,
    weightLogs: sampleWeightLogs(
      new Date(now - 4 * 24 * 60 * 60_000).toISOString(),
      [9.6, 9.4, 9.12, 8.84]
    ),
    note: "Sample watering.",
    createdAt: new Date(now - 4 * 24 * 60 * 60_000).toISOString(),
    archivedAt: null,
  },
  {
    id: "sample-open",
    bagId: "bag-1",
    wateredAt: new Date(now - 72 * 60_000).toISOString(),
    cutoffAt: cutoffAtForWatering(new Date(now - 72 * 60_000)),
    waterL: 2,
    waterTempC: 24.8,
    weightLogs: sampleWeightLogs(
      new Date(now - 72 * 60_000).toISOString(),
      [9.7, 9.62, 9.51, 9.43]
    ),
    note: "Sample open weigh window.",
    createdAt: new Date(now - 72 * 60_000).toISOString(),
    archivedAt: null,
  },
]
