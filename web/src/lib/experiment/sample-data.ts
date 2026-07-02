import type {
  IrrigationEvent,
  SupabaseTemperatureRow,
} from "./types"

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

export const sampleIrrigationEvents: IrrigationEvent[] = [
  {
    id: "sample-1",
    bagId: "bag-1",
    wateredAt: new Date(now - 6 * 24 * 60 * 60_000).toISOString(),
    waterL: 2,
    waterTempC: 25.2,
    preMassKg: 7.2,
    postMassKg: 9.18,
    drainedMassKg: 8.82,
    drainedAt: new Date(now - 6 * 24 * 60 * 60_000 + 62 * 60_000).toISOString(),
    note: "Sample watering.",
    createdAt: new Date(now - 6 * 24 * 60 * 60_000).toISOString(),
    archivedAt: null,
  },
  {
    id: "sample-2",
    bagId: "bag-1",
    wateredAt: new Date(now - 5 * 24 * 60 * 60_000).toISOString(),
    waterL: 2,
    waterTempC: 25,
    preMassKg: 7.58,
    postMassKg: 9.55,
    drainedMassKg: 8.86,
    drainedAt: new Date(now - 5 * 24 * 60 * 60_000 + 64 * 60_000).toISOString(),
    note: "Sample watering.",
    createdAt: new Date(now - 5 * 24 * 60 * 60_000).toISOString(),
    archivedAt: null,
  },
  {
    id: "sample-3",
    bagId: "bag-1",
    wateredAt: new Date(now - 4 * 24 * 60 * 60_000).toISOString(),
    waterL: 2,
    waterTempC: null,
    preMassKg: 7.62,
    postMassKg: 9.6,
    drainedMassKg: 8.84,
    drainedAt: new Date(now - 4 * 24 * 60 * 60_000 + 60 * 60_000).toISOString(),
    note: "Sample watering.",
    createdAt: new Date(now - 4 * 24 * 60 * 60_000).toISOString(),
    archivedAt: null,
  },
  {
    id: "sample-open",
    bagId: "bag-1",
    wateredAt: new Date(now - 72 * 60_000).toISOString(),
    waterL: 2,
    waterTempC: 24.8,
    preMassKg: 7.71,
    postMassKg: 9.7,
    drainedMassKg: null,
    drainedAt: null,
    note: "Sample open weigh window.",
    createdAt: new Date(now - 72 * 60_000).toISOString(),
    archivedAt: null,
  },
]
