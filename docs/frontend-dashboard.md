# Fresco Dashboard Workflow

The web dashboard in `web/` reads temperature telemetry from Supabase and writes
manual watering/weigh rows back to Supabase. The ESP32 remains the only
temperature writer.

## Dashboard

- Shows latest `control`, `surface`, `roots`, and `bottom` probe readings.
- Shows the current watering state: idle, counting, due, or overdue.
- Tracks weigh completion from `irrigation_events`.
- Shows a bucketed temperature chart with watering markers and shared 1 hour,
  1 day, and 1 week range tabs.

## Monitor

- Calls `/api/readings` with `page`, `pageSize`, `channel`, and `status`.
- Renders only one cloud-readings page at a time.
- Logs watering rows to `public.irrigation_events`.
- Logs +1 h weight by updating the same watering row.
- Supports late weight edits and soft delete through `archived_at`.

## Analytics

- Uses `/api/experiment-summary` for bucketed chart data.
- Shares the same 1 hour, 1 day, and 1 week range tabs across every chart.
- Shows baseline drift from `drained_mass_kg` over time.
- Shows daily water use from `drained_mass_kg(n) - pre_mass_kg(n+1)`.
- Shows first-hour drainage from `post_mass_kg - drained_mass_kg`.
- Shows root-zone daily temperature swing and watering recovery windows.
- Provides an explicit Parse Full Week action for complete 7-day metrics.

## Export

- Current readings export uses the visible paged table rows.
- Irrigation export includes active watering rows by default.
- Full-week analysis export is available after Parse Full Week completes.
