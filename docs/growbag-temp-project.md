# Fresco Greenovations Grow-Bag Temperature Study

## Purpose

This project tests whether cheap temperature probes can provide useful irrigation signals for grow bags. The current v1 goal is not to claim that temperature alone measures moisture. The goal is to compare thermal behavior with manual watering and weighing logs so we can decide when a bag likely needs water.

## Core Question

Can a small array of DS18B20 probes help answer:

> Kailangan ba tubigan?

The week-1 dashboard focuses on practical evidence:

- Did watering create a visible thermal response?
- How quickly did the root-zone temperature recover after watering?
- Did the bag return to a stable post-drain weight after the +1 h weigh?
- Is the baseline full weight drifting up, down, or staying flat?
- How much water was used between daily watering events?

## Temperature Setup

The grow-bag temperature firmware tracks four OneWire channels:

| Channel id | Purpose |
| --- | --- |
| `control` | Ambient/control reference near the setup |
| `surface` | Near the top of the grow medium |
| `roots` | Root-zone depth |
| `bottom` | Lower bag or drainage-zone depth |

The dashboard uses these readings to show thermal spread, daily swing, and watering recovery windows.

## Why Temperature Might Help

Water changes how a growing medium stores and transfers heat. Wet media usually warms and cools more slowly than dry media. Watering can also create a short thermal pulse, especially when irrigation water is cooler or warmer than the bag.

Useful signals may include:

- Smaller daily temperature swings after watering.
- Larger surface-to-root or root-to-bottom gradients during dry periods.
- A measurable recovery curve after irrigation.
- Repeated patterns between water input, drained weight, and later bag mass loss.

## Limits

Temperature is noisy in a greenhouse. Sunlight, airflow, irrigation water temperature, bag position, and ambient heat can all dominate the signal. DS18B20 probes are useful and cheap, but they are not a direct water-content instrument.

For v1, the dashboard treats temperature as supporting evidence. Manual water volume and bag mass are the main reference measurements.

## Week-1 Workflow

Objective: estimate daily water use for one bell pepper grow bag.

Default loop:

- Once per day at around 12:00 noon, water the bag with 2 liters.
- Log the watering time and volume.
- Record pre-watering bag mass when available.
- Record post-watering mass when available.
- Wait about 1 hour for drainage.
- Log the drained/full mass on the same watering event.
- Keep temperature telemetry running continuously.

## Metrics

The dashboard computes:

- Watering state: idle, counting, due, or overdue.
- Weigh completion: completed +1 h weighs over active watering events.
- First-hour drainage: `post_mass_kg - drained_mass_kg`.
- Daily water use: `drained_mass_kg(n) - pre_mass_kg(n + 1)`.
- Baseline drift: slope of drained/full mass over time.
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
- `Monitor` logs watering and +1 h weight rows to Supabase.
- `Analytics` shows baseline drift, average daily water use, first-hour drainage, temperature swing, and recovery windows.
- `Parse Full Week` performs explicit full-resolution analysis for up to 7 days without rendering every raw point.

## Scope Notes

- Firmware changes are not part of the dashboard workflow.
- Supabase is the source of truth for temperature readings and watering/weighing events.
- External sensor comparison is out of scope for v1.
- All user-facing timestamps are displayed in `Asia/Manila`; database timestamps stay UTC.
