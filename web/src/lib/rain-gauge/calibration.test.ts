import { describe, expect, it } from "vitest"

import {
  calibrationConfidence,
  parseCalibrationCsv,
  summarizeCalibrationTrials,
} from "./calibration"
import type { CalibrationTrial } from "./types"

const referenceCsv = `1,2,,,,,,,,,,,,,,
1.9,2.45,2.175,AVERAGE (1),,LOWEST VOLUME (1),,LOWEST VOLUME (2),,UNIFORMITY (1),,AVERAGE (3),,LOWEST VOLUME,,WITHIN RANGE
2,2,2,2.299047619,,2.069142857,,2.196,,64.29%,,2.36952381,,2.132571429,,41
2,2,2,,,,,,,,,,,,,
2,2,2,,,,,,,,,,,HIGHEST VOLUME,,
2,2.4,2.2,,,,,,,,,,,2.60647619,,
2,2,2,,,,,,,,,,,,,
2,2.15,2.075,AVERAGE (2),,HIGHEST VOLUME (1),,HIGHEST VOLUME (2),,UNIFORMITY (2),,,,UNIFORMITY,,
1.98,2.43,2.205,2.44,,2.528952381,,2.684,,90.48%,,,,48.81%,,
1.95,2.45,2.2,,,,,,,,,,,,,
1.85,2.45,2.15,,,,,,,,,,,STANDARD DEVIATION,,
2,2.65,2.325,,,,,,,,,,,0.274014795,,
2.13,2.65,2.39,,,WITHIN RANGE (1),,WITHIN RANGE (2),,,,,,,,
1.95,2.4,2.175,,,27,,38,,,,,,,
2,2.45,2.225,,,,,,,,,,,COEFFICIENT OF VARIATION,,
2,2.65,2.325,,,,,,,,,,,11.56%,,
2,2.65,2.325,,,STANDARD DEVIATION (1),,STANDARD DEVIATION (2),,,,,,,,
2,2.7,2.35,,,0.3081717095,,0.2164570593,,,,,,,,
2.15,2.8,2.475,,,,,,,,,,,,,
2.2,2.65,2.425,,,,,,,,,,,,,
2,2.85,2.425,,,COEFFICIENT OF VARIATION (1),,COEFFICIENT OF VARIATION (2),,,,,,,,
2.65,2.45,2.55,,,13.40432042,,8.871190956,,,,,,,,
2.65,2.55,2.6,,,,,,,,,,,,,
2.85,2.3,2.575,,,,,,,,,,,,,
2.45,2.45,2.45,,,,,,,,,,,,,
2.65,2.6,2.625,,,,,,,,,,,,,
2.65,2.35,2.5,,,,,,,,,,,,,
2.7,2.65,2.675,,,,,,,,,,,,,
2.4,2.2,2.3,,,,,,,,,,,,,
2.55,2.3,2.425,,,,,,,,,,,,,
2.75,2.3,2.525,2 data missing,,,,,,,,,,,,
2.3,2.25,2.275,,,,,,,,,,,,,
2.55,2.52,2.535,,,,,,,,,,,,,
2.45,2.35,2.4,,,,,,,,,,,,,
2.8,2.3,2.55,,,,,,,,,,,,,
2.25,2.35,2.3,,,,,,,,,,,,,
2.45,2.4,2.425,,,,,,,,,,,,,
2.55,2.4,2.475,,,,,,,,,,,,,
2.45,2.65,2.55,,,,,,,,,,,,,
2.65,2.6,2.625,,,,,,,,,,,,,
2.5,2.65,2.575,,,,,,,,,,,,,
2.65,2.38,2.515,,,,,,,,,,,,,
2.55,2.7,2.625,,,,,,,,,,,,,
1.3,,,,,,,,,,,,,,,
TOTAL TIPS: 86,,,,,,,,,,,,,,,
using 5ml syringe= 72 tips,,,,,,,,,,,,,,,
200ml no syringe=,14 tips,,,,,,,,,,,,,,
initial hypothesis:,,"reduced accuracy if magkakusog ang ulan",,,,,,,,,,,,,
,need i change ang design sa top to increase resistance sa flow sa water,,,,,,,,,,,,,,
,and para ma uniform ang speed sa drop sa water sa bottom regardless sa kakusog sa ulan,,,,,,,,,,,,,,`

describe("rain gauge calibration CSV", () => {
  it("parses the loose wide calibration sheet and recomputes metrics", () => {
    const result = parseCalibrationCsv(referenceCsv)

    expect(result.summary.rowCount).toBe(50)
    expect(result.summary.columnCount).toBe(16)
    expect(result.trials).toHaveLength(42)
    expect(result.summary.meanPairAverageMl).toBeCloseTo(2.369524, 5)
    expect(result.summary.bucket1CvPct).toBeCloseTo(13.4, 1)
    expect(result.summary.bucket2CvPct).toBeCloseTo(8.87, 2)
    expect(result.summary.coefficientOfVariationPct).toBeCloseTo(8.19, 2)
    expect(result.summary.footerNotes.map((note) => note.text).join(" ")).toContain(
      "TOTAL TIPS: 86"
    )
  })

  it("reports moderate confidence for the reference variation", () => {
    const result = parseCalibrationCsv(referenceCsv)

    expect(calibrationConfidence(result.summary).label).toBe(
      "Moderate Confidence"
    )
  })
})

function manualTrial(
  sourceRow: number,
  bucket1VolumeMl: number,
  bucket2VolumeMl: number
): CalibrationTrial {
  return {
    id: `manual-${sourceRow}`,
    sourceRow,
    bucket1VolumeMl,
    bucket2VolumeMl,
    pairAverageMl: Number(((bucket1VolumeMl + bucket2VolumeMl) / 2).toFixed(6)),
    method: "manual",
    notes: "",
  }
}

describe("manual calibration trials", () => {
  it("recomputes metrics from bench-entered bucket volumes", () => {
    const summary = summarizeCalibrationTrials([
      manualTrial(1, 2, 2.4),
      manualTrial(2, 2.2, 2.4),
      manualTrial(3, 1.8, 2.2),
    ])

    expect(summary.trialCount).toBe(3)
    expect(summary.bucket1MeanMl).toBeCloseTo(2, 6)
    expect(summary.bucket2MeanMl).toBeCloseTo(2.333333, 5)
    expect(summary.meanPairAverageMl).toBeCloseTo(2.166667, 5)
    expect(summary.bucketBiasMl).toBeCloseTo(0.333333, 5)
    // (2 + 2.4) + (2.2 + 2.4) + (1.8 + 2.2)
    expect(summary.totalVolumeMl).toBeCloseTo(13, 6)
  })

  it("returns null-ish metrics for an empty trial set", () => {
    const summary = summarizeCalibrationTrials([])

    expect(summary.trialCount).toBe(0)
    expect(summary.totalVolumeMl).toBe(0)
    expect(summary.meanPairAverageMl).toBeNull()
    expect(summary.withinRangePct).toBeNull()
    expect(summary.footerNotes).toEqual([])
  })
})
