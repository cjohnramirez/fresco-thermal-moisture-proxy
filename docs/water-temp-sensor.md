# Water Temperature Sensor (Pin 14)

Firmware emits a fifth `water` DS18B20 (GPIO 14). The dashboard uses it to
prefill the Log Watering `Water Temp (C)` field. This behavior is **implemented**
(the guardrail and dialog changes below are live); this doc describes how it works.

## Goal

A fifth DS18B20 on **GPIO 14** measures **irrigation-water temperature**. It is
supporting evidence for one watering, not a grow-medium probe. The dashboard
records it **once per watering session** into the existing
`irrigation_events.water_temp_c` field — it is not per-checkpoint and not a
temperature-dashboard channel.

## Decisions (locked)

| Question | Decision |
| --- | --- |
| Granularity | One value **per watering session**, not per weigh checkpoint. |
| Storage | Reuse the existing event-level `water_temp_c`. **No new column, no new API.** |
| Dashboard UI | **Weigh-context only.** No probe card, no chart line, not in health/spread/gradient/swing. |
| Capture | Auto-fill the Water Temp field in **Log Watering** from the latest `water` reading; keep it human-editable. |

## Firmware state (already done)

`src/temperature.cpp` now has a fifth bus `{"water", 14}`. Every upload to
`public.temperature_readings` now carries an extra channel:

```json
{ "id": "water", "pin": 14, "devices": 1, "ts": "ok", "tc": 24.8, "tf": 76.6 }
```

So `water` readings will start arriving through the normal temperature pipeline
(`normalizeSupabaseRows` → `NormalizedReading` with `channelId: "water"`,
`pin: 14`) with **no frontend change**. That is expected. The work below is (A)
one guardrail so those readings do not pollute existing temperature stats, and
(B) the auto-fill feature.

## A. Guardrail — keep `water` out of grow-bag aggregates

Most consumers already ignore unknown channels because they iterate the
hardcoded `CHANNELS` (4 grow-bag probes) or filter to a specific id. **Do not**
add `water` to `CHANNELS` — that is what keeps them clean. Verified safe as-is:

- `probe-card` / `DashboardView` probe grid — iterate `CHANNELS`. Safe.
- `sensorHealth`, `temperatureSpread` — iterate `CHANNELS`. Safe.
- `TemperatureChart` — renders only `control/surface/roots/bottom` areas. Safe.
- `gradientSeriesFromChartRows` — surface/roots/bottom only. Safe.
- `dailySwing(readings, "roots")`, `irrigationRelaxationFromEvents` — roots only. Safe.
- Monitor channel filter dropdown — iterates `CHANNELS`, so `water` is not a
  filter option. Safe (matches "weigh-context only").

**One required fix — `temperatureStats` in [web/src/lib/experiment/summary.ts](../web/src/lib/experiment/summary.ts):**
it computes global min/max over **all** `ok` readings, so it would fold in
water temperature and skew the Analytics "temperature min/max" and the
week-analysis CSV. Exclude `water` (e.g. skip `reading.channelId === "water"`,
or better, restrict to `CHANNELS` ids). Add/adjust a test in
`summary.test.ts` proving a `water` reading does not move min/max.

Acceptable-as-is but worth a small polish:

- Monitor "All Channels" readings table will list raw `water` rows. That is fine
  (raw telemetry). Consider making `labelForChannel` return `"Water"` for
  `water` in [web/src/features/dashboard/lib/format.ts](../web/src/features/dashboard/lib/format.ts) so the row reads nicely.
- Temperature CSV export will include `water` rows — desirable, leave it.

## B. Feature — Water Temp prefill + refresh on Log Watering

The `Water Temp (C)` field prefills from the latest `water` reading and has a
manual **Refresh Water Temp** button. It remains editable/clearable.

**Extraction helper.** `usableWaterTempC(reading)` in
[web/src/lib/experiment/analytics.ts](../web/src/lib/experiment/analytics.ts)
returns `reading.celsius` only when the reading is present, `status === "ok"`, and
`celsius !== null`; otherwise `null`. Used by both the prefill and the refresh so
they behave identically.

**Source of the value.** `useFrescoDashboard`
([web/src/features/dashboard/hooks/use-fresco-dashboard.ts](../web/src/features/dashboard/hooks/use-fresco-dashboard.ts))
exposes:
- `latestWaterTempC = usableWaterTempC(latest.get("water"))` — from readings
  already loaded for the probe cards (`latest` is the `latestByChannel` map).
- `refreshWaterTemp()` — a targeted `GET /api/readings?channel=water&status=ok&page=1&pageSize=1&sessionId=...`
  fetch that returns `usableWaterTempC(readings.at(-1))` (readings are ascending;
  the newest packet contains the `water` channel), or `null` on error/empty.

Both shells pass these into the dialog: `FrescoAppShell` (the real entrypoint)
and the legacy `FrescoDashboard`.

**Dialog behavior.** In
[web/src/features/dashboard/components/irrigation-dialogs.tsx](../web/src/features/dashboard/components/irrigation-dialogs.tsx),
`LogWateringDialog` takes `defaultWaterTempC: number | null` and
`onRefreshWaterTemp: () => Promise<number | null>`:

- The `waterTempC` input is controlled state seeded from `defaultWaterTempC` in
  the `useState` initializer. The parent remounts the dialog on open (`key`), so
  it re-seeds each open — no state-sync effect that could clobber edits.
- A `Button variant="outline"` "Refresh Water Temp" sits under the field: disabled
  while refreshing/submitting, `Spinner data-icon="inline-start"` while loading
  else `RefreshCwIcon data-icon="inline-start"`. On click it calls
  `onRefreshWaterTemp()`; a number replaces the field, `null` keeps the current
  value and shows a `sonner` toast ("No fresh water reading available.").
- On submit the existing payload key `waterTempC` is unchanged — the POST body,
  `createIrrigationEventSchema`, `toSupabaseIrrigationPayload`, and `water_temp_c`
  column all stay as they are.

**Nothing else changes.** `IrrigationWeightLog` stays as-is (no `waterTempC`),
the details dialog's existing "Water Temp" tile keeps working, and irrigation
CSV columns are unchanged.

## Non-goals (do not do these)

- Do **not** add a `water` probe card or a fifth chart area.
- Do **not** add `water` to `CHANNELS`, `chartConfig`, `sensorHealth`, or
  `temperatureSpread`.
- Do **not** add a per-checkpoint water-temp field to `IrrigationWeightLog` or
  the Log Weight dialog.
- Do **not** add a new DB column or API route.

## Optional — in-app docs viewer

This guide is not in the docs allowlist. To surface it in the in-app viewer, add
a `water-temp-sensor` entry to `PROJECT_DOCS` and `ProjectDocSlug` in
[web/src/lib/project-docs/docs.ts](../web/src/lib/project-docs/docs.ts) and
update the route test. Not required for the feature.

## Acceptance criteria

1. Logging a watering pre-fills Water Temp from the latest `ok` `water` reading;
   the value is editable and saves to `water_temp_c` as before.
2. With no fresh `water` reading, the field is blank and watering still saves.
3. Analytics temperature min/max and the week-analysis CSV are unaffected by
   `water` readings (covered by a test).
4. No new probe card, chart line, or per-checkpoint field appears.
5. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass.
</content>
</invoke>
