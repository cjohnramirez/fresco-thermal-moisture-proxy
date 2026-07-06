# Fresco API Reference

This repository has two data paths:

- Temperature: ESP32 joins Wi-Fi and uploads DS18B20 packets directly to Supabase.
- Rain gauge: ESP32 hosts a local access point and HTTP/SSE API; the Next.js app proxies that API for the browser and stores readings locally.

## Temperature Firmware

Source: [src/temperature.cpp](../src/temperature.cpp), configured by [include/TemperatureConfig.h](../include/TemperatureConfig.h).

### Sensor Mapping

| Channel id | Board label | ESP32 GPIO | Role |
| --- | --- | --- | --- |
| `control` | D5 | 5 | Ambient/control reference |
| `surface` | D4 | 4 | Top of grow medium |
| `roots` | D16 | 16 | Root zone |
| `bottom` | D17 | 17 | Lower bag / drainage zone |
| `water` | D14 | 14 | Irrigation-water probe (see below) |

The `water` channel is a fifth DS18B20 that measures irrigation-water
temperature. It rides the same continuous upload as the four grow-bag probes,
but it is **not** a grow-medium probe: the dashboard treats it as weigh-context
only and reads it once per watering to fill `irrigation_events.water_temp_c`.
See [water-temp-sensor.md](water-temp-sensor.md).

### Payload

Each firmware upload inserts one JSON payload into `public.temperature_readings.payload`.

```json
{
  "type": "temperature",
  "seq": 42,
  "ms": 123456,
  "sensors": 5,
  "ts": "ok",
  "channels": [
    { "id": "control", "pin": 5, "devices": 1, "ts": "ok", "tc": 24.5, "tf": 76.1 },
    { "id": "surface", "pin": 4, "devices": 1, "ts": "ok", "tc": 23.9, "tf": 75.0 },
    { "id": "roots", "pin": 16, "devices": 1, "ts": "ok", "tc": 22.1, "tf": 71.8 },
    { "id": "bottom", "pin": 17, "devices": 0, "ts": "no_sensor", "tc": null, "tf": null },
    { "id": "water", "pin": 14, "devices": 1, "ts": "ok", "tc": 24.8, "tf": 76.6 }
  ]
}
```

Channel statuses are `boot`, `ok`, `partial`, `no_sensor`, and `read_failed`. The frontend may normalize malformed packets as `parse_error`.

### Device Write

```http
POST {SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {SUPABASE_ANON_KEY}
Content-Type: application/json
Prefer: return=minimal

{ "payload": { "type": "temperature", "channels": [] } }
```

`201 Created` means Supabase accepted the row.

## Rain Gauge Firmware

Source: [src/rain_gauge.cpp](../src/rain_gauge.cpp), configured by [include/RainGaugeConfig.h](../include/RainGaugeConfig.h).

### Access Point

| Setting | Value |
| --- | --- |
| SSID | `FrescoRainGauge` |
| Password | `raingauge` |
| URL | `http://192.168.4.1` |
| Tip pin | GPIO 34 |

The firmware counts both hall-sensor edges. A physical bucket tip is exposed as `tips = edges / 2`, and all rainfall totals use physical tips.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Built-in reference page |
| `GET` | `/api/status` | AP, calibration, and counter metadata |
| `GET` | `/api/readings` | Latest reading snapshot |
| `GET` | `/events` | Server-Sent Events stream; named event `reading` |
| `POST` | `/api/reset` | Zero the current firmware session counters |

### Status Packet

```json
{
  "device": "fresco-rain-gauge",
  "uptimeMs": 123456,
  "sessionStartMs": 1000,
  "ssid": "FrescoRainGauge",
  "ip": "192.168.4.1",
  "clients": 1,
  "sseClients": 1,
  "tipPin": 34,
  "debounceMs": 50,
  "countsBothEdges": true,
  "mlPerTip": 2.3695,
  "catchmentAreaCm2": 0,
  "mmPerTip": null,
  "edges": 84,
  "tips": 42
}
```

### Reading Packet

`/api/readings` and every SSE `reading` event use this shape:

```json
{
  "type": "rain_gauge",
  "seq": 12,
  "ms": 123456,
  "edges": 84,
  "tips": 42,
  "lastEdgeMs": 120000,
  "rainfallMl": 99.52,
  "rainfallMm": null,
  "rateMlPerMin": 3.2,
  "rateMmPerHr": null
}
```

`rainfallMm`, `rateMmPerHr`, and `mmPerTip` are `null` until `RAIN_GAUGE_CATCHMENT_AREA_CM2` is configured.

## Next.js API Routes

### Temperature And Irrigation

| Route | Purpose |
| --- | --- |
| `GET /api/readings` | Paged, flattened temperature readings from Supabase |
| `GET /api/irrigation-events` | Active or archived watering rows |
| `POST /api/irrigation-events` | Create a watering row |
| `PATCH /api/irrigation-events/[id]` | Update watering metadata or one 10-minute checkpoint weight |
| `DELETE /api/irrigation-events/[id]` | Soft delete through `archived_at` |
| `GET /api/experiment-summary` | Bucketed chart and metric data |
| `POST /api/week-analysis` | Full-resolution server-side 7-day analysis |

`GET /api/readings` supports `page`, `pageSize`, `channel`, `status`, and `sessionId`. It never sends a full week of raw readings to the browser.

`GET /api/experiment-summary` supports `range=1h|1d|1w`, with default buckets of `1m`, `10m`, and `1h`.

### Rain Gauge Proxy

The flashed rain firmware does not document CORS headers, so the browser talks to local Next.js routes and the server proxies AP calls.

| Route | Proxied AP path | Purpose |
| --- | --- | --- |
| `GET /api/rain-gauge/status?baseUrl=` | `/api/status` | Validate and return status |
| `GET /api/rain-gauge/readings?baseUrl=` | `/api/readings` | Validate and return latest reading |
| `GET /api/rain-gauge/events?baseUrl=` | `/events` | Proxy SSE stream |
| `POST /api/rain-gauge/reset?baseUrl=` | `/api/reset` | Reset firmware counters |
| `POST /api/rain-gauge/sync` | Supabase | Optional manual sync |

`baseUrl` is allowlisted to `http://192.168.4.1` plus localhost addresses for tests and mocks.

### Project Docs

| Route | Purpose |
| --- | --- |
| `GET /api/project-docs` | List allowlisted docs |
| `GET /api/project-docs/[slug]` | Return one allowlisted Markdown file |

Allowed slugs are `readme`, `api`, `data-contract`, `frontend-dashboard`, `growbag-temp-project`, and `rain-gauge-project`.

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

```sql
create table if not exists public.irrigation_events (
  id bigint generated always as identity primary key,
  bag_id text not null default 'bag-1',
  watered_at timestamptz not null default now(),
  cutoff_at timestamptz not null,
  water_l numeric(5,2) not null default 2.0,
  water_temp_c numeric(4,1),
  weight_logs jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists irrigation_events_bag_watered_at_idx
  on public.irrigation_events (bag_id, watered_at desc);

create index if not exists irrigation_events_open_window_idx
  on public.irrigation_events (bag_id, cutoff_at)
  where archived_at is null;

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

`weight_logs` stores an array of checkpoint objects:

```json
[
  {
    "slotAt": "2026-07-02T00:10:00.000Z",
    "weighedAt": "2026-07-02T00:11:00.000Z",
    "massKg": 9.5,
    "note": "first checkpoint"
  }
]
```

The app sets `cutoff_at` to 6 PM Manila time on the watering date. It prevents a second open watering row for a bag while an active row has `cutoff_at > now()`.

For an existing table that used the old one-hour mass columns, migrate in two
steps: add the new columns, deploy the app, then drop old columns only after
confirming no data still needs to be exported.

```sql
alter table public.irrigation_events
  add column if not exists cutoff_at timestamptz,
  add column if not exists weight_logs jsonb not null default '[]'::jsonb;

update public.irrigation_events
set cutoff_at =
  (((watered_at at time zone 'Asia/Manila')::date + time '18:00')
    at time zone 'Asia/Manila')
where cutoff_at is null;

alter table public.irrigation_events
  alter column cutoff_at set not null;

-- Optional cleanup after exporting legacy mass data.
alter table public.irrigation_events
  drop column if exists pre_mass_kg,
  drop column if exists post_mass_kg,
  drop column if exists drained_mass_kg,
  drop column if exists drained_at;
```

### Rain Gauge Sync Tables

Rain sync is manual and optional. These tables are separate from temperature and irrigation data.

```sql
create table if not exists public.rain_gauge_sessions (
  id text primary key,
  label text not null,
  source text not null default 'ap',
  started_at timestamptz not null,
  ended_at timestamptz,
  ap_base_url text,
  ml_per_tip numeric,
  catchment_area_cm2 numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.rain_gauge_readings (
  id text primary key,
  session_id text not null references public.rain_gauge_sessions(id) on delete cascade,
  received_at timestamptz not null,
  seq bigint,
  device_ms bigint,
  edges bigint not null,
  tips numeric not null,
  pending_half_tip boolean not null default false,
  last_edge_ms bigint,
  rainfall_ml numeric not null,
  rainfall_mm numeric,
  rate_ml_per_min numeric not null,
  rate_mm_per_hr numeric,
  raw jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.rain_gauge_sessions enable row level security;
alter table public.rain_gauge_readings enable row level security;

create policy "anon read rain sessions"
  on public.rain_gauge_sessions
  for select
  to anon
  using (true);

create policy "anon read rain readings"
  on public.rain_gauge_readings
  for select
  to anon
  using (true);
```

Server-side sync uses `SUPABASE_SERVICE_ROLE_KEY`, so inserts/upserts do not need anon write policies.

## Analytics Definitions

- Pending half-tip: `edges` is odd.
- Rainfall ml: `tips * mlPerTip`.
- Rainfall mm: `(rainfallMl / catchmentAreaCm2) * 10`, when catchment area is known.
- Open irrigation event: latest active row where `cutoff_at > now()`.
- Checkpoint slots: every 10 minutes after `watered_at` through `cutoff_at`.
- Due checkpoint: an unlogged slot whose scheduled `slotAt` is at or before now.
- Skipped checkpoint: an unlogged slot after `cutoff_at`.
- Checkpoint weight change: first logged checkpoint mass minus latest logged checkpoint mass.
- Daily water use: first logged checkpoint mass minus latest logged checkpoint mass for each usable watering window.
- Baseline drift: slope of latest logged checkpoint mass over `watered_at`; flat is `abs(slope) < 0.05 kg/day`.

Timestamps are stored in UTC and displayed in `Asia/Manila` where the dashboard shows user-facing time.
