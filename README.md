# ESP32 Temperature Telemetry

PlatformIO firmware plus a Next.js dashboard for the Fresco grow-bag
temperature experiment. The ESP32 uploads temperature payloads to Supabase.
The web dashboard reads those rows, logs manual watering and +1 h weighing rows
to Supabase, and computes the week-1 irrigation signals from `project.md`.

```text
DS18B20 buses -> ESP32 Wi-Fi -> Supabase -> Next.js dashboard
manual watering/weigh logs -> Supabase -> dashboard analytics
```

See [API.md](API.md) for the firmware payload, Supabase schema, and dashboard
API routes. See [project.md](project.md) for the experiment goal.

## Wiring

| Channel id | Board label | ESP32 GPIO |
| --- | --- | --- |
| `control` | D5 | GPIO 5 |
| `surface` | D4 | GPIO 4 |
| `roots` | D16 | GPIO 16 |
| `bottom` | D17 | GPIO 17 |

All DS18B20 sensors share `3V3` and `GND`: red/VDD to `3V3`, black/GND to
`GND`. Put a 4.7k pull-up resistor from each data line to `3V3`. The firmware
also enables internal pull-ups, but the external resistors are the reliable
part.

## Firmware Setup

Set firmware constants in [include/TemperatureConfig.h](include/TemperatureConfig.h):

- `WIFI_SSID` and `WIFI_PASSWORD`: a 2.4 GHz Wi-Fi network.
- `SUPABASE_URL`: your Supabase project URL, without a trailing slash.
- `SUPABASE_ANON_KEY`: the anon key allowed to insert telemetry.
- `SUPABASE_TABLE`: defaults to `temperature_readings`.

Create the Supabase tables and policies from [API.md](API.md#supabase-schema).

## Flash And Monitor

Requires PlatformIO:

```powershell
pio run -e nodemcu-32s
pio run -e nodemcu-32s -t upload
pio device monitor -e nodemcu-32s
```

Expected boot log:

```text
Connecting to Wi-Fi "FrescoGreenovation". connected, IP 192.168.3.169
Supabase POST -> 201
```

## Web Dashboard

The dashboard lives in [web/](web/):

```powershell
cd web
npm install
copy .env.example .env.local
npm run dev
```

Set these values in `web/.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is optional for local testing, but recommended for
server routes that read and write dashboard data. Keep it server-only.

Open `http://localhost:3000`. The dashboard reads `public.temperature_readings`,
logs watering rows to `public.irrigation_events`, and derives the +1 h weigh
timer from open Supabase rows.

## Dashboard Workflow

- `Dashboard`: watering status, weigh completion, sensor health, cloud row
  count, thermal spread, latest probe values, and watering markers on the
  temperature chart.
- `Monitor`: log watering, log +1 h weight, edit/archive watering events, and
  page through cloud readings with `50`, `100`, or `250` rows per page.
- `Analytics`: bucketed charts for temperature, baseline drift, daily water use,
  first-hour drainage, root temperature swing, and watering recovery windows.
- Chart headers share 1 hour, 1 day, and 1 week range tabs for fast default
  rendering.
- `Parse Full Week`: explicitly fetches up to 7 days server-side and returns
  compact full-resolution metrics without rendering every raw point.

The app does not store high-frequency readings in browser storage. Only light UI
state is kept in memory.

## CSV Export

Use the dashboard `Export` menu to download:

- the current paged temperature readings, one CSV row per channel reading
- active irrigation events
- full-week analysis metrics after `Parse Full Week` completes

CSV export still works even when Supabase sync is unavailable for new rows.

## Verification

Run the assembled verification suite from `web/`:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```
"# fresco-thermal-moisture-proxy" 
