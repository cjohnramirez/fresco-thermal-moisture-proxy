# Rain Gauge Tipping Bucket Test

Firmware and dashboard support for a tipping-bucket rain gauge on an ESP32. The board hosts its own Wi-Fi access point and serves tip/rainfall data over HTTP and Server-Sent Events at `http://192.168.4.1`.

## Goal

A tipping-bucket rain gauge converts water volume into bucket tips. Counting tips over time gives total rainfall and rainfall rate.

This project answers:

- Does the hall-effect sensor reliably register each tip?
- Is the debounce interval suppressing bounce without missing real tips?
- What calibrated milliliters-per-tip value should the dashboard use?
- How does local AP data look when visualized over 1 hour, 1 day, and 1 week?

## Hardware

| Component | Details |
| --- | --- |
| MCU board | NodeMCU-32S ESP32 |
| Sensor | HW-477 hall-effect sensor module |
| Mechanism | Tipping bucket with a magnet mounted on the tipping arm |

### Wiring

| HW-477 pin | ESP32 pin |
| --- | --- |
| S | GPIO 34 |
| + | 3V3 |
| - | GND |

GPIO 34 is input-only and has no internal pull-up or pull-down. This setup relies on the HW-477 module's onboard pull-up. If using a bare switch or bare hall sensor, add the correct external pull-up.

## Firmware Behavior

Source: [src/rain_gauge.cpp](../src/rain_gauge.cpp), configured by [include/RainGaugeConfig.h](../include/RainGaugeConfig.h).

1. The ESP32 starts SoftAP SSID `FrescoRainGauge` with password `raingauge`.
2. The AP serves HTTP at `http://192.168.4.1`.
3. GPIO 34 is attached on `CHANGE`, so the firmware counts both magnet-arrival and magnet-leaving edges.
4. The ISR only updates counters and timestamps.
5. The main loop snapshots counters, computes rainfall/rate, prints serial updates, and pushes SSE packets.

Because both edges are counted, one physical bucket tip is:

```text
tips = edges / 2
rainfall_ml = tips * ml_per_tip
```

`RAIN_GAUGE_ML_PER_TIP` defaults to about `2.3695 ml`, based on the reference calibration CSV. Depth in mm is only emitted when `RAIN_GAUGE_CATCHMENT_AREA_CM2` is configured.

## AP Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Plain firmware reference UI |
| `GET` | `/api/status` | Device, AP, counters, and calibration |
| `GET` | `/api/readings` | Latest reading snapshot |
| `GET` | `/events` | SSE stream with named `reading` events |
| `POST` | `/api/reset` | Zero current firmware session counters |

Reading packets look like:

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

## Frontend Workflow

The web dashboard uses the same shared shell as the temperature dashboard.

1. Start the web app with `npm run dev` from `web/`.
2. Connect the computer to Wi-Fi SSID `FrescoRainGauge`.
3. Open `http://localhost:3000`.
4. Use the sidebar dashboard dropdown to switch to `Rain Gauge`.
5. Keep AP URL as `http://192.168.4.1`, or use a localhost mock for tests.
6. Click `Connect`.

The dashboard talks to local Next API routes:

- `/api/rain-gauge/status`
- `/api/rain-gauge/readings`
- `/api/rain-gauge/events`
- `/api/rain-gauge/reset`
- `/api/rain-gauge/sync`

The proxy keeps the browser from depending on ESP32 CORS behavior.

## Local Storage

Rain readings are stored in IndexedDB stores:

- `sessions`
- `readings`
- `calibrationTrials`
- `settings`
- `syncQueue`

localStorage keeps only light preferences, such as AP URL and active rain session id.

## Calibration CSV

The frontend can import the reference rain-gauge CSV and normalize paired bucket rows into:

- bucket 1 volume in ml
- bucket 2 volume in ml
- pair average ml
- source row
- optional note

It recomputes mean, min/max, standard deviation, coefficient of variation, bucket bias, within-range count, and missing-data count. The current reference shape is 50 rows by 16 columns with 42 paired numeric rows and an average near `2.3695 ml`.

## CSV Export And Sync

CSV export is always available:

- current rain readings page
- full local rain session
- calibration trials
- analytics summary

Optional Supabase sync writes to separate rain tables: `rain_gauge_sessions` and `rain_gauge_readings`. It does not write into temperature or irrigation tables.

## Building And Flashing

```powershell
pio run -e rain-gauge
pio run -e rain-gauge -t upload
pio device monitor -e rain-gauge
```

Expected serial output includes:

```text
Rain Gauge Access Point
SoftAP "FrescoRainGauge" started
URL: http://192.168.4.1
HTTP server + SSE ready. Monitoring for tips...
```

## Known Limits

- One physical tip is two counted edges; odd edge counts are shown as pending half-tip states.
- Very fast tips can be undercounted if the two edges fall inside the debounce window.
- mm conversion requires a configured catchment area.
- On-device persistence is not provided; browser IndexedDB stores dashboard history.
