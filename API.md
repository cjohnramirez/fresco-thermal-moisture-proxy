# Temperature Telemetry API Reference

The ESP32 samples DS18B20 temperature buses and uploads each payload directly to
Supabase over HTTPS. The Next.js dashboard reads that telemetry from Supabase
and writes manual watering/weighing rows to `public.irrigation_events`.

```text
DS18B20 buses -> ESP32 -> Supabase REST -> Postgres -> Next.js dashboard
```

## Sensor Mapping

Each OneWire bus is one channel. IDs and pins are defined in
[src/main.cpp](src/main.cpp).

| Channel id | Board label | ESP32 GPIO |
| --- | --- | --- |
| `control` | D5 | 5 |
| `surface` | D4 | 4 |
| `roots` | D16 | 16 |
| `bottom` | D17 | 17 |

## Firmware Payload

Every sample is serialized to this JSON object and stored in the
`temperature_readings.payload` `jsonb` column.

```json
{
  "type": "temperature",
  "seq": 42,
  "ms": 123456,
  "sensors": 4,
  "ts": "ok",
  "channels": [
    { "id": "control", "pin": 5, "devices": 1, "ts": "ok", "tc": 24.5, "tf": 76.1 },
    { "id": "surface", "pin": 4, "devices": 1, "ts": "ok", "tc": 23.9, "tf": 75.0 },
    { "id": "roots", "pin": 16, "devices": 1, "ts": "ok", "tc": 22.1, "tf": 71.8 },
    { "id": "bottom", "pin": 17, "devices": 0, "ts": "no_sensor", "tc": null, "tf": null }
  ]
}
```

Status values are `boot`, `ok`, `partial`, `no_sensor`, and `read_failed`.
The frontend also normalizes malformed input as `parse_error`.

## Device Write API

The firmware inserts one row per upload via Supabase REST. Uploads are
throttled by `SUPABASE_POST_INTERVAL_MS` in
[include/TemperatureConfig.h](include/TemperatureConfig.h).

```http
POST {SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {SUPABASE_ANON_KEY}
Content-Type: application/json
Prefer: return=minimal

{ "payload": { "type": "temperature", "channels": [] } }
```

`201 Created` means the row was accepted.

## Supabase Schema

### Temperature Readings

```sql
create table if not exists public.temperature_readings (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

alter table public.temperature_readings enable row level security;

create policy "device can insert readings"
  on public.temperature_readings
  for insert
  to anon
  with check (true);

create policy "dashboard can read readings"
  on public.temperature_readings
  for select
  to anon
  using (true);
```

### Irrigation Events

One watering action is one row. The +1 h weigh updates that same row with
`drained_mass_kg` and `drained_at`. Deletes in the dashboard are soft deletes
through `archived_at`.

```sql
create table if not exists public.irrigation_events (
  id bigint generated always as identity primary key,
  bag_id text not null default 'bag-1',
  watered_at timestamptz not null default now(),
  water_l numeric(5,2) not null default 2.0,
  water_temp_c numeric(4,1),
  pre_mass_kg numeric(6,3),
  post_mass_kg numeric(6,3),
  drained_mass_kg numeric(6,3),
  drained_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index if not exists irrigation_events_one_open_per_bag
  on public.irrigation_events (bag_id)
  where drained_mass_kg is null and archived_at is null;

alter table public.irrigation_events enable row level security;

create policy "anon read irrigation"
  on public.irrigation_events
  for select
  to anon
  using (true);

create policy "anon write irrigation"
  on public.irrigation_events
  for insert
  to anon
  with check (true);

create policy "anon edit irrigation"
  on public.irrigation_events
  for update
  to anon
  using (true)
  with check (true);
```

## Dashboard API Routes

### `GET /api/readings`

Query params:

| Param | Default | Notes |
| --- | --- | --- |
| `page` | `1` | Server-side page number. |
| `pageSize` | `100` | Allowed by UI: `50`, `100`, `250`. |
| `channel` | `all` | Optional channel filter after payload normalization. |
| `status` | `all` | Optional normalized status filter. |
| `sessionId` | `supabase-cloud` | Frontend row ID prefix. |

Returns paged, flattened channel readings. It never returns a full week of raw
rows to the browser.

### `GET /api/irrigation-events`

Query params:

| Param | Default | Notes |
| --- | --- | --- |
| `bagId` | `bag-1` | Current UI supports one active bag. |
| `includeArchived` | `false` | Include soft-deleted rows when true. |

### `POST /api/irrigation-events`

Creates a watering row. Validation:

- `water_l > 0`
- mass fields are nullable or between `0.5` and `20` kg
- timestamps are ISO strings and stored as UTC
- `bag_id` defaults to `bag-1`

The route rejects a new open row when another active row has
`drained_mass_kg is null`.

### `PATCH /api/irrigation-events/[id]`

Updates watering or weigh fields on the same row. The +1 h weigh dialog sends
`drained_mass_kg` and `drained_at`.

### `DELETE /api/irrigation-events/[id]`

Soft deletes the row by setting `archived_at = now()`.

### `GET /api/experiment-summary`

Query params:

| Param | Default | Notes |
| --- | --- | --- |
| `bagId` | `bag-1` | Event filter. |
| `range` | `1d` | `1h`, `1d`, or `1w`; controls the default chart window and bucket. |
| `from` | based on `range` | UTC ISO timestamp. |
| `to` | now | UTC ISO timestamp. |
| `bucket` | based on `range` | Optional override: `1m`, `10m`, `30m`, `1h`, or `1d`. |

Returns bucketed chart rows and compact metrics for dashboard rendering. Default
buckets are `1m` for 1 hour, `10m` for 1 day, and `1h` for 1 week.

### `POST /api/week-analysis`

Body:

```json
{
  "bagId": "bag-1",
  "from": "2026-07-01T00:00:00.000Z",
  "to": "2026-07-08T00:00:00.000Z"
}
```

The range must be greater than 0 and no longer than 7 days. The server fetches
temperature rows in Supabase batches, computes full-resolution metrics, and
returns summaries instead of plotting every raw point.

## Analytics Definitions

- Open event: latest active row where `drained_mass_kg is null`.
- Due time: `watered_at + 1 hour`.
- Overdue: at least 2 hours after `watered_at`.
- First-hour drainage: `post_mass_kg - drained_mass_kg`.
- Daily water use: `drained_mass_kg(n) - pre_mass_kg(n + 1)`.
- Baseline drift: slope of `drained_mass_kg` over `watered_at`; flat is
  `abs(slope) < 0.05 kg/day`.
- Late weigh flag: `drained_at - watered_at` outside 45 to 90 minutes.

Timestamps are stored in UTC and displayed in `Asia/Manila`.

## Build, Flash, And Monitor

Requires PlatformIO:

```bash
pio run -e nodemcu-32s
pio run -e nodemcu-32s -t upload
pio run -e nodemcu-32s -t upload --upload-port COM10
pio device monitor -e nodemcu-32s
```
