# Fresco Dashboard Workflow

The web dashboard in `web/` is a Next.js App Router app with a shared shell and dashboard selector. Firmware remains separate: temperature data comes from Supabase, while rain gauge data comes from the ESP32 access point through local API proxy routes.

## Shared Shell

- The sidebar header contains a dashboard dropdown above the view list.
- A Project Docs button opens the Markdown viewer for allowlisted repository docs.
- The view list is shared across dashboards: `Dashboard`, `Monitor`, and `Analytics`.
- The top header stays compact and changes actions based on the selected dashboard.
- Light and dark mode use the existing shadcn theme system.

Feature code is grouped by ownership:

- `features/app-shell`: dashboard selector, sidebar, and main shell.
- `features/dashboard`: temperature dashboard, Supabase readings, watering, and weighing.
- `features/rain-gauge`: AP connection, local rain storage, calibration, charts, and exports.
- `features/project-docs`: docs list, fetch, and Markdown viewer.

## Temperature Dashboard

The temperature dashboard reads from Supabase and does not write firmware data.

### Dashboard

- Latest `control`, `surface`, `roots`, and `bottom` probe values.
- Watering status from `irrigation_events`: idle, counting, due, or overdue.
- Weigh completion and active watering state.
- Sensor health, cloud row count, thermal spread, and chart overlays.
- Shared chart range tabs: 1 hour, 1 day, and 1 week.

### Monitor

- Server-paginated cloud readings with `page`, `pageSize`, `channel`, and `status`.
- Log watering dialog with current-time defaults and a `Use Current Time` action.
- +1 h weigh dialog that updates the same watering row.
- Events table with edit, archive visibility, and soft delete.

### Analytics

- Bucketed charts from `/api/experiment-summary`.
- Baseline drift, average daily water use, first-hour drainage, temperature swing, and watering recovery windows.
- Explicit Parse Full Week action for up to 7 days of full-resolution server-side analysis.
- Full parse returns summaries and exports instead of rendering every raw point.

## Rain Gauge Dashboard

The rain gauge dashboard is local-first. It connects to the ESP32 AP through Next.js proxy routes so the browser does not depend on ESP32 CORS headers.

### Dashboard

- Connection status and latest packet status.
- Total rainfall, tips, edges, current rate, last edge, and calibration values.
- AP clients and SSE clients from `/api/status`.
- Pending half-tip indicator when `edges` is odd.
- Rainfall chart with 1 hour, 1 day, and 1 week range tabs.

### Monitor

- AP URL field, defaulting to `http://192.168.4.1`.
- Connect/disconnect controls for the SSE stream.
- Refresh status action.
- Raw packet stream for quick debugging.
- Paginated local readings table.
- Reset Session action that calls `POST /api/rain-gauge/reset`, clears current in-memory readings, and starts a new local session id.

### Analytics

- Rain rate over time.
- Hourly and daily rainfall totals.
- Tip interval and pending half-tip signals.
- Calibration quality cards based on imported CSV trials.
- Calibration volume chart comparing bucket 1, bucket 2, and pair average.
- CSV exports for current page, full local session, calibration trials, and analytics summary.
- Optional Supabase sync that is disabled with a clear state when env vars are missing.

## Project Docs Viewer

The docs viewer renders Markdown through the installed Prompt-kit Markdown component. Only allowlisted files can be fetched:

- `README.md`
- `docs/api.md`
- `docs/data-contract.md`
- `docs/frontend-dashboard.md`
- `docs/growbag-temp-project.md`
- `docs/rain-gauge-project.md`

The viewer keeps code/pre formatting inside Markdown content while dashboard UI remains on the shared sans design language.

## Performance Notes

- Temperature readings stay server-paginated and bucketed for charts.
- Rain readings are stored in IndexedDB, not localStorage.
- Tables render one page at a time.
- Chart range tabs keep normal rendering fast.
- Full week analysis remains explicit and server-side for temperature data.
- CSV export remains available even if Supabase is unavailable.

## Validation Targets

After feature work is assembled, run:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser checks should cover the two dashboard modes, docs viewer, mobile sidebar behavior, rain connection empty/error/loading states, calibration import, CSV exports, dark/light mode, and responsive chart/table overflow.
