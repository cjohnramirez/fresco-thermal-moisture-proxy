# Rain Gauge Dashboard, Docs Viewer, AP Firmware, API, README, And Calibration CSV Plan

## Summary
Add a second dashboard type for a tipping-bucket rain gauge beside the existing Supabase-backed temperature dashboard, plus an in-app Markdown docs viewer and a calibration analytics workflow based on the provided rain-gauge CSV reference. Rain gauge data stays local-first through the ESP32 access point, with CSV export and optional Supabase sync.

## Key Changes
- Add a multi-dashboard sidebar header using shadcn composition:
  - `SidebarHeader -> SidebarMenu -> SidebarMenuItem -> DropdownMenu`.
  - First header control: large dashboard switcher for `Temperature` and `Rain Gauge`.
  - Second header control: docs dropdown/button, visually grouped above the `Views` sidebar group.
  - Sidebar items below remain `Dashboard`, `Monitor`, and `Analytics` for the active dashboard type.
  - Navbar title updates to `Temperature Dashboard`, `Rain Gauge Dashboard`, or `Project Docs`.

- Add a Markdown docs viewer:
  - Use Prompt-kit Markdown via shadcn CLI: `npx shadcn@latest add "https://prompt-kit.com/c/markdown.json"`.
  - Render allowlisted local docs only: `README.md`, `docs/api.md`, `docs/data-contract.md`, `docs/frontend-dashboard.md`, `docs/growbag-temp-project.md`, and `docs/rain-gauge-project.md`.
  - Add a safe docs API/route that rejects non-allowlisted paths.
  - Use shadcn loading, empty, and error states.

- Separate firmware by source file:
  - Temperature firmware: `src/temperature.cpp`.
  - Rain gauge firmware: `src/rain_gauge.cpp`.
  - Use PlatformIO source filters so each env builds only its own C++ entry file.

- Add ESP32 rain gauge AP firmware:
  - NodeMCU-32S + HW-477 wiring: `S -> GPIO 34`, `+ -> 3V3`, `- -> GND`.
  - Count both magnet-in and magnet-out edges (active-low `CHANGE`) with debounce; two edges make one physical tip, so rainfall uses `tips = edges / 2`.
  - ISR only updates volatile counters; publishing happens in `loop()`.
  - Serve `GET /api/status`, `GET /api/readings`, `GET /events`, and `POST /api/reset`.

- Add rain gauge frontend:
  - Default AP URL: `http://192.168.4.1`.
  - Realtime connection via Server-Sent Events.
  - IndexedDB stores for sessions, readings, calibration trials, settings, and sync queue.
  - CSV export for current page, full session, calibration trials, and analytics summary.
  - Optional Supabase sync disabled when env vars are missing.

## Calibration CSV And Analytics Additions
- Treat `Green House Plant Parameters and Indicators - Rain Gauge.csv` as a calibration reference, not the realtime AP packet format.
- Add a Rain Gauge `Calibration` section inside Analytics:
  - CSV import for loose/wide calibration sheets.
  - Normalize rows into paired bucket measurements: `bucket1VolumeMl`, `bucket2VolumeMl`, `pairAverageMl`, `method`, `notes`, and `sourceRow`.
  - Extract footer notes like total tips, syringe/no-syringe trials, missing data, and design hypotheses.
  - Recompute metrics in code instead of trusting embedded spreadsheet summary cells.

- Metrics to show:
  - Mean volume per tip/pair.
  - Bucket 1 vs Bucket 2 average and bias.
  - Min/max volume.
  - Standard deviation.
  - Coefficient of variation.
  - Uniformity or within-range percentage.
  - Missing-data count.
  - Flow-method comparison, especially syringe vs no-syringe/high-flow trials.
  - Design-risk note: stronger rainfall/flow may reduce accuracy, so the UI should surface calibration confidence.

- CSV-derived reference values to preserve in tests/docs:
  - 50 rows and 16 columns in the provided file.
  - 42 paired numeric calibration rows.
  - Pair average mean around `2.3695 ml`.
  - Bucket 1 mean around `2.2990 ml`, CV around `13.40%`.
  - Bucket 2 mean around `2.4400 ml`, CV around `8.87%`.
  - Pair average CV around `8.19%`.
  - Mean bucket-to-bucket absolute delta around `0.3005 ml`.
  - Footer notes include `TOTAL TIPS: 86`, `using 5ml syringe = 72 tips`, and `200ml no syringe = 14 tips`.

- Visualization additions:
  - Calibration scatter/strip chart for bucket volumes.
  - Bucket 1 vs Bucket 2 comparison chart.
  - Histogram of volume per tip/pair.
  - Uniformity gauge/card.
  - Flow-method comparison chart.
  - Calibration confidence card that explains whether live rain totals should be trusted or treated as provisional.

- Conversion rule:
  - Store calibration as `ml_per_tip`.
  - Convert to `mm_per_tip` only when gauge catchment area is configured:
    `mm_per_tip = (ml_per_tip / catchment_area_cm2) * 10`.

## Documentation Updates
- Update `docs/api.md` with Temperature and Rain Gauge API sections.
- Update main `README.md` with the two dashboard/firmware modes, rain gauge wiring, flashing, AP workflow, docs viewer, calibration import, local storage, CSV export, and optional Supabase sync.
- Update `docs/data-contract.md` with rain gauge readings, calibration trial rows, CSV columns, IndexedDB stores, and Supabase sync tables.
- Add rain gauge Supabase SQL separately from existing temperature/irrigation tables.

## Test Plan
- Firmware tests for debounce, active-low tip counting, rainfall math, rain-rate math, env source filtering, and session reset.
- Frontend tests for SSE parsing, IndexedDB pagination, CSV export, docs allowlist safety, Markdown rendering, and missing-Supabase disabled states.
- Calibration parser tests using the provided CSV shape:
  - loose/wide rows,
  - embedded summary labels,
  - footer notes,
  - missing data row,
  - recomputed mean, standard deviation, CV, and bucket bias.
- API route tests for rain gauge sync, docs loading, and validation failures.
- Browser checks for dashboard switching, docs header access, Markdown readability, calibration charts, and responsive sidebar behavior.
- Final verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, PlatformIO checks when `pio` is available, and Playwright checks with mocked SSE/docs/calibration data.

## Assumptions
- Rain Gauge lives inside the same `web/` app.
- Dashboard selector and docs access both live in the sidebar header.
- Markdown viewing is allowlist-based for local project docs only.
- Rain gauge data is local-first; Supabase sync is manual and optional.
- Calibration CSV import is for analysis and confidence scoring, not for replacing realtime rain readings.
