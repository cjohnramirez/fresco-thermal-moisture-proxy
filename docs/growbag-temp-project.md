# Fresco Greenovations Grow-Bag Temperature Study

## Purpose

This project tests whether cheap temperature probes can provide useful irrigation signals for grow bags. The current v1 goal is not to claim that temperature alone measures moisture. The goal is to compare thermal behavior with manual watering and weighing logs so we can decide when a bag likely needs water.

## Core Question

Can a small array of DS18B20 probes help answer:

> Kailangan ba tubigan?

The week-1 dashboard focuses on practical evidence:

- Did watering create a visible thermal response?
- How quickly did the root-zone temperature recover after watering?
- Did the bag return to a stable checkpoint weight before the 6 PM cutoff?
- Is the baseline full weight drifting up, down, or staying flat?
- How much water was used between daily watering events?

## Temperature Setup

The grow-bag temperature firmware tracks five OneWire channels:

| Channel id | Purpose |
| --- | --- |
| `control` | Ambient/control reference near the setup |
| `surface` | Near the top of the grow medium |
| `roots` | Root-zone depth |
| `bottom` | Lower bag or drainage-zone depth |
| `water` | Irrigation-water temperature (GPIO 14) |

The dashboard uses the four grow-bag readings to show thermal spread, daily swing, and watering recovery windows. The `water` channel is separate supporting evidence: it is not a grow-medium probe, so it stays out of those aggregates and is only read once per watering to record the irrigation-water temperature for that event. See [water-temp-sensor.md](water-temp-sensor.md).

## Why Temperature Might Help

Water changes how a growing medium stores and transfers heat. Wet media usually warms and cools more slowly than dry media. Watering can also create a short thermal pulse, especially when irrigation water is cooler or warmer than the bag.

Useful signals may include:

- Smaller daily temperature swings after watering.
- Larger surface-to-root or root-to-bottom gradients during dry periods.
- A measurable recovery curve after irrigation.
- Repeated patterns between water input, checkpoint weights, and later bag mass loss.

## Limits

Temperature is noisy in a greenhouse. Sunlight, airflow, irrigation water temperature, bag position, and ambient heat can all dominate the signal. DS18B20 probes are useful and cheap, but they are not a direct water-content instrument.

For v1, the dashboard treats temperature as supporting evidence. Manual water volume and bag mass are the main reference measurements.

## Week-1 Workflow

Objective: estimate daily water use for one bell pepper grow bag.

Default loop:

- Once per day before 6 PM Manila time, water the bag with 2 liters.
- Log the watering time and volume.
- Weigh the bag every 10 minutes after watering until 6 PM.
- Log each checkpoint mass on the same watering event.
- Keep temperature telemetry running continuously.

## Metrics

The dashboard computes:

- Watering state: idle, counting, or due.
- Weigh completion: completed schedules plus skipped 10-minute checkpoints.
- Checkpoint weight change: first logged checkpoint mass minus latest logged checkpoint mass.
- Daily water use: first logged checkpoint mass minus latest logged checkpoint mass for each usable watering window.
- Baseline drift: slope of latest logged checkpoint mass over time.
- Temperature recovery windows after watering.
- Root-zone daily swing.
- Thermal spread across channels.

## Decisions We Want To Make

| Signal | Interpretation |
| --- | --- |
| Bag full mass stays flat | Current water amount may be reasonable. |
| Bag full mass drifts downward | The plant may be using more water than supplied. |
| Bag full mass drifts upward | The bag may be retaining too much water. |
| Thermal recovery slows after watering | The medium may be staying wetter or cooling unevenly. |
| Root-zone swing increases | The bag may be drying faster or receiving more heat stress. |

## Frontend Mapping

- `Dashboard` shows watering state, weigh completion, cloud rows, thermal spread, and latest probes.
- `Monitor` logs watering rows and 10-minute checkpoint weights to Supabase.
- `Analytics` shows baseline drift, checkpoint loss, watering-window change, temperature swing, and recovery windows.
- `Parse Full Week` performs explicit full-resolution analysis for up to 7 days without rendering every raw point.

## Scope Notes

- Firmware changes are not part of the dashboard workflow.
- Supabase is the source of truth for temperature readings and watering/weighing events.
- External sensor comparison is out of scope for v1.
- All user-facing timestamps are displayed in `Asia/Manila`; database timestamps stay UTC.
