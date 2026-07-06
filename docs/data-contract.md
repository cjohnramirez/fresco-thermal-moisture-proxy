# Fresco Data Contract

This document describes how the web app parses temperature, irrigation, rain gauge, calibration, and export data. API details are in [api.md](api.md).

## Temperature Rows

Supabase stores one firmware payload per row.

```ts
type TemperatureSupabaseRow = {
  id: number
  created_at: string
  payload: TemperatureFirmwarePacket
}
```

The `water` channel (GPIO 14) is the irrigation-water probe. It flattens into a
`TemperatureReading` like any other channel, but it is weigh-context only: it is
excluded from the grow-bag probe cards, thermal spread, gradient, and swing, and
is read once per watering to fill `IrrigationEvent.waterTempC`. See
[water-temp-sensor.md](water-temp-sensor.md).

The frontend flattens every `payload.channels[]` item into one reading row.

```ts
type TemperatureReading = {
  sessionId: string
  receivedAt: string
  seq: number | null
  deviceMs: number | null
  channelId: "control" | "surface" | "roots" | "bottom" | "water" | string
  pin: number
  devices: number | null
  status: string
  celsius: number | null
  fahrenheit: number | null
  raw: string
}
```

`receivedAt` is Supabase `created_at`.

## Irrigation Events

One watering event is one Supabase row. Checkpoint weights update the same row
as `weightLogs`.

```ts
type IrrigationWeightLog = {
  slotAt: string
  weighedAt: string
  massKg: number
  note: string
}

type IrrigationEvent = {
  id: string
  bagId: string
  wateredAt: string
  cutoffAt: string
  waterL: number
  waterTempC: number | null
  weightLogs: IrrigationWeightLog[]
  note: string
  createdAt: string
  archivedAt: string | null
}
```

The first checkpoint slot is 10 minutes after `wateredAt`; slots repeat every
10 minutes through the 6 PM Manila cutoff stored in `cutoffAt`.

`waterTempC` is one value per watering, not per checkpoint. It is sourced from
the `water` temperature channel: when a watering is logged, the app reads the
latest `water` reading and uses it to fill the field (still human-editable).

Rows with `archivedAt` are hidden from active charts and exports by default.

## Rain Gauge Packets

The ESP32 AP returns status and readings from `http://192.168.4.1`.

```ts
type RainGaugeStatusPacket = {
  device: string
  uptimeMs: number
  sessionStartMs: number
  ssid: string
  ip: string
  clients: number
  sseClients: number
  tipPin: number
  debounceMs: number
  countsBothEdges: boolean
  mlPerTip: number
  catchmentAreaCm2: number
  mmPerTip: number | null
  edges: number
  tips: number
}
```

```ts
type RainGaugeReadingPacket = {
  type: "rain_gauge"
  seq: number
  ms: number
  edges: number
  tips: number
  lastEdgeMs: number | null
  rainfallMl: number
  rainfallMm: number | null
  rateMlPerMin: number
  rateMmPerHr: number | null
}
```

Because firmware counts both hall-sensor edges, `pendingHalfTip` is true when `edges` is odd.

```ts
type RainGaugeReading = {
  id: string
  sessionId: string
  receivedAt: string
  seq: number
  deviceMs: number
  edges: number
  tips: number
  pendingHalfTip: boolean
  lastEdgeMs: number | null
  rainfallMl: number
  rainfallMm: number | null
  rateMlPerMin: number
  rateMmPerHr: number | null
  raw: string
}
```

## Rain Gauge IndexedDB

The rain dashboard is local-first and uses IndexedDB database `fresco-rain-gauge`.

| Store | Key | Contents |
| --- | --- | --- |
| `sessions` | `id` | Local rain sessions, AP URL, calibration constants |
| `readings` | `id` | Normalized rain reading rows |
| `calibrationTrials` | `id` | Parsed paired bucket calibration rows |
| `settings` | `key` | Reserved for local rain settings |
| `syncQueue` | `id` | Reserved for retryable sync state |

localStorage is limited to lightweight UI preferences such as active dashboard, AP URL, and active rain session id.

## Calibration CSV

Loose/wide calibration sheets are parsed into paired bucket rows.

```ts
type CalibrationTrial = {
  id: string
  sourceRow: number
  bucket1VolumeMl: number
  bucket2VolumeMl: number
  pairAverageMl: number
  note: string | null
}
```

The parser also extracts footer notes such as `TOTAL TIPS: 86`, `using 5ml syringe = 72 tips`, and `200ml no syringe = 14 tips`.

Computed calibration metrics:

- mean, min, max, standard deviation, and coefficient of variation
- bucket bias, reported as bucket 2 minus bucket 1
- within-range count and percentage
- missing-data count
- source row and column counts

The reference CSV shape used by tests is 50 rows by 16 columns with 42 paired numeric rows. The mean pair average is about `2.3695 ml`.

## Frontend API Responses

- `/api/readings` returns one paged set of flattened temperature readings.
- `/api/irrigation-events` returns active watering rows unless archived rows are requested.
- `/api/experiment-summary` returns bucketed chart data and compact metrics for `range=1h`, `range=1d`, or `range=1w`.
- `/api/week-analysis` parses a selected 7-day temperature range server-side and returns full-resolution metrics without plotting every raw point.
- `/api/rain-gauge/status` returns a validated rain gauge status packet.
- `/api/rain-gauge/readings` returns one validated rain gauge reading packet.
- `/api/rain-gauge/events` streams rain gauge SSE packets.
- `/api/project-docs/[slug]` returns one allowlisted Markdown file.

## CSV Exports

Temperature CSV columns:

```text
session_id,received_at,seq,device_ms,channel_id,pin,devices,status,celsius,fahrenheit
```

Irrigation CSV columns:

```text
id,bag_id,watered_at,cutoff_at,water_l,water_temp_c,weight_log_count,latest_weight_kg,weight_logs,note,created_at,archived_at
```

Irrigation weight-log CSV columns:

```text
event_id,bag_id,slot_at,weighed_at,mass_kg,note,watered_at,cutoff_at,archived_at
```

Rain readings CSV columns:

```text
id,session_id,received_at,seq,device_ms,edges,tips,pending_half_tip,last_edge_ms,rainfall_ml,rainfall_mm,rate_ml_per_min,rate_mm_per_hr
```

Rain calibration CSV columns:

```text
id,source_row,bucket_1_volume_ml,bucket_2_volume_ml,pair_average_ml,note
```

Analytics summary CSV columns:

```text
metric,day,value,unit,from,to,notes
```

Week-analysis CSV columns:

```text
metric,day,value,unit,from,to,notes
```

## Optional Rain Supabase Sync

Manual rain sync sends:

```ts
type RainGaugeSyncPayload = {
  session: RainGaugeSession
  readings: RainGaugeReading[]
}
```

The server upserts into `public.rain_gauge_sessions` and `public.rain_gauge_readings`. If Supabase env vars are missing, the UI shows sync as unavailable but keeps local storage and CSV export enabled.
