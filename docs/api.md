# Fresco API Reference

This repository has two data paths:

- Temperature: ESP32 joins Wi-Fi and uploads DS18B20 packets directly to Supabase.
- Rain gauge: ESP32 hosts a local access point and HTTP/SSE API; the Next.js app proxies that API for the browser and stores readings locally.

## Temperature Firmware

Source: [src/temperature.cpp](../src/temperature.cpp), configured by [include/TemperatureConfig.h](../include/TemperatureConfig.h).

### Sensor Mapping

| Channel id | Board label | ESP32 GPIO |
| --- | --- | --- |
| `control` | D5 | 5 |
| `surface` | D4 | 4 |
| `roots` | D16 | 16 |
| `bottom` | D17 | 17 |

### Payload

Each firmware upload inserts one JSON payload into `public.temperature_readings.payload`.

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
| `PATCH /api/irrigation-events/[id]` | Update watering or +1 h weigh fields |
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
- Open irrigation event: latest active row where `drained_mass_kg is null`.
- Due time: `watered_at + 1 hour`.
- Overdue irrigation weigh: at least 2 hours after `watered_at`.
- First-hour drainage: `post_mass_kg - drained_mass_kg`.
- Daily water use: `drained_mass_kg(n) - pre_mass_kg(n + 1)`.
- Baseline drift: slope of `drained_mass_kg` over `watered_at`; flat is `abs(slope) < 0.05 kg/day`.

Timestamps are stored in UTC and displayed in `Asia/Manila` where the dashboard shows user-facing time.
