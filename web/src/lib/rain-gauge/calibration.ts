import type {
  CalibrationFooterNote,
  CalibrationParseResult,
  CalibrationSummary,
  CalibrationTrial,
} from "./types"

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ""
  let quoted = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index++
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === "," && !quoted) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

export function parseLooseCsv(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map(parseCsvLine)
}

function numericCell(value: string | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.replace(/%$/, "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function average(values: number[]) {
  if (values.length === 0) {
    return null
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return null
  }

  const mean = average(values)
  if (mean === null) {
    return null
  }

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1)
  return Math.sqrt(variance)
}

function coefficientOfVariation(values: number[]) {
  const mean = average(values)
  const sd = standardDeviation(values)

  if (!mean || sd === null) {
    return null
  }

  return (sd / mean) * 100
}

function round(value: number | null, decimals = 6) {
  if (value === null) {
    return null
  }

  return Number(value.toFixed(decimals))
}

function min(values: number[]) {
  return values.length > 0 ? Math.min(...values) : null
}

function max(values: number[]) {
  return values.length > 0 ? Math.max(...values) : null
}

function footerNote(row: string[], sourceRow: number): CalibrationFooterNote | null {
  const text = row.filter(Boolean).join(" ").trim()
  if (!text) {
    return null
  }

  const hasLetters = /[a-z]/i.test(text)
  const startsWithSummaryLabel = /average|volume|uniformity|within range|standard deviation|coefficient/i.test(text)

  if (!hasLetters || startsWithSummaryLabel) {
    return null
  }

  return { sourceRow, text }
}

function isBucketLabelRow(row: string[], index: number) {
  return (
    index === 0 &&
    numericCell(row[0]) === 1 &&
    numericCell(row[1]) === 2 &&
    numericCell(row[2]) === null &&
    row.slice(2).every((cell) => cell === "")
  )
}

// Columns emitted by calibrationTrialsToCsv; the natural width of a trial set
// that did not originate from a wide spreadsheet.
const CALIBRATION_TRIAL_COLUMNS = 6

// Recomputes every calibration metric from a set of paired trials. Shared by
// CSV import and manual entry so both paths produce identical numbers; sheet
// metadata (row/column counts, footer notes) is passed through via `meta`.
export function summarizeCalibrationTrials(
  trials: CalibrationTrial[],
  meta: {
    rowCount?: number
    columnCount?: number
    missingRows?: number
    footerNotes?: CalibrationFooterNote[]
  } = {}
): CalibrationSummary {
  const pairAverages = trials.map((trial) => trial.pairAverageMl)
  const bucket1Values = trials.map((trial) => trial.bucket1VolumeMl)
  const bucket2Values = trials.map((trial) => trial.bucket2VolumeMl)
  const deltas = trials.map((trial) =>
    Math.abs(trial.bucket1VolumeMl - trial.bucket2VolumeMl)
  )
  const meanPairAverageMl = average(pairAverages)
  const withinRangeCount =
    meanPairAverageMl === null
      ? 0
      : pairAverages.filter(
          (value) => Math.abs(value - meanPairAverageMl) / meanPairAverageMl <= 0.1
        ).length
  const bucket1Mean = average(bucket1Values)
  const bucket2Mean = average(bucket2Values)
  // Total water measured across both buckets over every trial.
  const totalVolumeMl =
    bucket1Values.reduce((sum, value) => sum + value, 0) +
    bucket2Values.reduce((sum, value) => sum + value, 0)

  return {
    rowCount: meta.rowCount ?? trials.length,
    columnCount: meta.columnCount ?? CALIBRATION_TRIAL_COLUMNS,
    trialCount: trials.length,
    missingRows: meta.missingRows ?? 0,
    totalVolumeMl: Number(totalVolumeMl.toFixed(6)),
    meanPairAverageMl: round(meanPairAverageMl),
    minPairAverageMl: round(min(pairAverages)),
    maxPairAverageMl: round(max(pairAverages)),
    standardDeviationMl: round(standardDeviation(pairAverages)),
    coefficientOfVariationPct: round(coefficientOfVariation(pairAverages), 2),
    bucket1MeanMl: round(bucket1Mean),
    bucket2MeanMl: round(bucket2Mean),
    bucketBiasMl:
      bucket1Mean !== null && bucket2Mean !== null
        ? round(bucket2Mean - bucket1Mean)
        : null,
    bucket1CvPct: round(coefficientOfVariation(bucket1Values), 2),
    bucket2CvPct: round(coefficientOfVariation(bucket2Values), 2),
    meanAbsoluteDeltaMl: round(average(deltas)),
    withinRangeCount,
    withinRangePct:
      trials.length > 0 ? round((withinRangeCount / trials.length) * 100, 2) : null,
    footerNotes: meta.footerNotes ?? [],
  }
}

export function parseCalibrationCsv(text: string): CalibrationParseResult {
  const rows = parseLooseCsv(text)
  const columnCount = rows.reduce((count, row) => Math.max(count, row.length), 0)
  const trials: CalibrationTrial[] = []
  const footerNotes: CalibrationFooterNote[] = []
  let missingRows = 0

  rows.forEach((row, index) => {
    if (isBucketLabelRow(row, index)) {
      return
    }

    const bucket1 = numericCell(row[0])
    const bucket2 = numericCell(row[1])
    const sourceRow = index + 1

    if (bucket1 !== null && bucket2 !== null) {
      const pairAverage = numericCell(row[2]) ?? (bucket1 + bucket2) / 2
      trials.push({
        id: `calibration-row-${sourceRow}`,
        sourceRow,
        bucket1VolumeMl: bucket1,
        bucket2VolumeMl: bucket2,
        pairAverageMl: Number(pairAverage.toFixed(6)),
        method: "",
        notes: "",
      })
      return
    }

    if (bucket1 !== null || bucket2 !== null) {
      missingRows++
    }

    const note = footerNote(row, sourceRow)
    if (note) {
      footerNotes.push(note)
    }
  })

  const summary = summarizeCalibrationTrials(trials, {
    rowCount: rows.length,
    columnCount,
    missingRows,
    footerNotes,
  })

  return { summary, trials }
}

export function calibrationConfidence(summary: CalibrationSummary) {
  if (summary.trialCount < 10 || summary.coefficientOfVariationPct === null) {
    return {
      label: "Needs More Data",
      description: "Import more paired tip-volume trials before trusting live totals.",
    }
  }

  if (summary.coefficientOfVariationPct <= 5) {
    return {
      label: "High Confidence",
      description: "Calibration spread is tight enough for reliable session totals.",
    }
  }

  if (summary.coefficientOfVariationPct <= 10) {
    return {
      label: "Moderate Confidence",
      description: "Live totals are useful, but repeat calibration before deployment.",
    }
  }

  return {
    label: "Calibration Risk",
    description: "Volume spread is high; treat live rainfall as provisional.",
  }
}
