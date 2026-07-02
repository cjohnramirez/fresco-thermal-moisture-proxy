# Fresco Temperature Data Contract

This frontend follows [API.md](../API.md). The ESP32 inserts temperature rows
into `public.temperature_readings`; the dashboard reads those rows and writes
manual watering/weigh rows to `public.irrigation_events`.

## Temperature Row

```ts
{
  id: number
  created_at: string
  payload: FirmwarePacket
}
```

The dashboard flattens every `payload.channels[]` item into one frontend row:

```ts
{
  sessionId: string
  receivedAt: string
  seq: number | null
  deviceMs: number | null
  channelId: "control" | "surface" | "roots" | "bottom" | string
  pin: number
  devices: number | null
  status: string
  celsius: number | null
  fahrenheit: number | null
  raw: string
}
```

`receivedAt` is Supabase `created_at`.

## Irrigation Event

One watering event is one row. The +1 h weight updates the same row.

```ts
{
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
```

Rows with `archivedAt` are hidden from active charts and exports by default.

## Frontend API Responses

- `/api/readings` returns one paged set of flattened temperature readings.
- `/api/irrigation-events` returns active watering rows unless archived rows are requested.
- `/api/experiment-summary` returns bucketed chart data and compact metrics for
  `range=1h`, `range=1d`, or `range=1w`.
- `/api/week-analysis` parses a selected 7-day range server-side and returns full-resolution metrics without plotting every raw point.

## CSV Exports

Temperature CSV columns:

```text
session_id,received_at,seq,device_ms,channel_id,pin,devices,status,celsius,fahrenheit
```

Irrigation CSV columns:

```text
id,bag_id,watered_at,water_l,water_temp_c,pre_mass_kg,post_mass_kg,drained_mass_kg,drained_at,note,created_at,archived_at
```

Week-analysis CSV columns:

```text
metric,day,value,unit,from,to,notes
```
