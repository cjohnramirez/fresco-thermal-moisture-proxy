# Fresco Telemetry Dashboards

PlatformIO firmware plus a Next.js dashboard for two Fresco greenhouse tools:

- Grow-bag temperature telemetry: ESP32 DS18B20 probes upload read-only rows to Supabase.
- Rain gauge telemetry: ESP32 SoftAP serves live tipping-bucket readings at `http://192.168.4.1`; the web dashboard stores rain data locally and can optionally sync it to Supabase.

```text
temperature probes -> ESP32 Wi-Fi -> Supabase -> Next.js dashboard
rain gauge AP -> Next.js API proxy -> IndexedDB/dashboard -> CSV or optional Supabase sync
manual watering/weigh logs -> Supabase -> dashboard analytics
```

Detailed references live in [docs/api.md](docs/api.md), [docs/data-contract.md](docs/data-contract.md), [docs/frontend-dashboard.md](docs/frontend-dashboard.md), [docs/growbag-temp-project.md](docs/growbag-temp-project.md), and [docs/rain-gauge-project.md](docs/rain-gauge-project.md). The web app also includes an allowlisted Markdown docs viewer for these files.

## Project Structure

```text
temperature/
├── include/
│   ├── RainGaugeConfig.h
│   └── TemperatureConfig.h
├── src/
│   ├── rain_gauge.cpp
│   └── temperature.cpp
├── docs/
└── web/
```

`platformio.ini` keeps the firmware separated by environment. The temperature build uses `src/temperature.cpp`; the rain gauge build uses `src/rain_gauge.cpp`.

## Temperature Hardware

| Channel id | Board label | ESP32 GPIO |
| --- | --- | --- |
| `control` | D5 | GPIO 5 |
| `surface` | D4 | GPIO 4 |
| `roots` | D16 | GPIO 16 |
| `bottom` | D17 | GPIO 17 |

All DS18B20 sensors share `3V3` and `GND`. Use a 4.7k pull-up resistor from each data line to `3V3`.

## Rain Gauge Hardware

| HW-477 pin | ESP32 pin |
| --- | --- |
| S | GPIO 34 |
| + | 3V3 |
| - | GND |

GPIO 34 is input-only and has no internal pull-up. The HW-477 module's onboard pull-up is part of the intended wiring.

## Firmware Setup

Temperature constants are in [include/TemperatureConfig.h](include/TemperatureConfig.h):

- `WIFI_SSID` and `WIFI_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_TABLE`

Rain gauge constants are in [include/RainGaugeConfig.h](include/RainGaugeConfig.h):

- `RAIN_GAUGE_AP_SSID`: `FrescoRainGauge`
- `RAIN_GAUGE_AP_PASSWORD`: `raingauge`
- `RAIN_GAUGE_TIP_PIN`: GPIO 34
- `RAIN_GAUGE_ML_PER_TIP`: default calibration mean, about `2.3695 ml`
- `RAIN_GAUGE_CATCHMENT_AREA_CM2`: set this to enable mm conversion

## Flash And Monitor

Requires PlatformIO.

```powershell
# Temperature firmware
pio run -e nodemcu-32s
pio run -e nodemcu-32s -t upload
pio device monitor -e nodemcu-32s

# Rain gauge firmware
pio run -e rain-gauge
pio run -e rain-gauge -t upload
pio device monitor -e rain-gauge
```

For the rain gauge, connect your computer to Wi-Fi SSID `FrescoRainGauge` with password `raingauge`, then open `http://192.168.4.1` or use the web dashboard proxy.

## Web Dashboard

The frontend lives in [web/](web/):

```powershell
cd web
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Set these values in `web/.env.local` for Supabase-backed temperature and optional rain sync:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. CSV export and local rain storage still work when Supabase is not configured.

## Dashboard Modes

The sidebar header has a dashboard dropdown above the view list:

- Temperature dashboard: reads `temperature_readings`, logs watering/weighing rows, and computes the week-1 grow-bag irrigation signals.
- Rain Gauge dashboard: connects to the ESP32 AP through Next API proxy routes, stores readings in IndexedDB, imports calibration CSVs, exports CSVs, and optionally syncs to rain-specific Supabase tables.
- Project Docs: renders allowlisted Markdown files from the repository.

Each dashboard keeps the same three views:

- `Dashboard`: current status and summary cards.
- `Monitor`: connection/logging controls, raw packets, and paginated readings.
- `Analytics`: charts, range tabs, exports, and computed metrics.

## Rain Gauge Workflow

1. Flash the rain gauge firmware and connect to SSID `FrescoRainGauge`.
2. Start the web app locally.
3. Switch the sidebar dashboard selector to `Rain Gauge`.
4. Keep AP URL as `http://192.168.4.1` unless using a localhost mock.
5. Click `Connect` to open the SSE stream through `/api/rain-gauge/events`.
6. Use `Reset Session` only when you want to zero the ESP32 counters and start a new local session.
7. Import the reference calibration CSV from Analytics when recalibrating the gauge.
8. Export current page, full local session, calibration rows, or analytics summary as CSV.

Rain readings are stored in IndexedDB, not localStorage. localStorage is used only for small preferences such as the active dashboard and AP URL.

## Verification

Run the assembled verification suite from `web/`:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```
