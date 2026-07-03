"use client"

import * as React from "react"

import { downloadCsv } from "@/lib/experiment/csv"
import {
  calibrationTrialsToCsv,
  rainGaugeAnalyticsToCsv,
  rainGaugeReadingsToCsv,
} from "@/lib/rain-gauge/csv"
import type {
  CalibrationSummary,
  CalibrationTrial,
  RainGaugeReading,
  RainGaugeSession,
  RainGaugeSummary,
} from "@/lib/rain-gauge/types"

// Owns the four CSV downloads: current page, full session, calibration trials,
// and the analytics summary. Pure actions over already-derived data.
export function useRainGaugeExport({
  calibrationSummary,
  calibrationTrials,
  page,
  pagedReadings,
  readings,
  session,
  summary,
}: {
  calibrationSummary: CalibrationSummary | null
  calibrationTrials: CalibrationTrial[]
  page: number
  pagedReadings: RainGaugeReading[]
  readings: RainGaugeReading[]
  session: RainGaugeSession
  summary: RainGaugeSummary
}) {
  const exportCurrentReadings = React.useCallback(() => {
    downloadCsv(
      `rain-gauge-readings-page-${page}.csv`,
      rainGaugeReadingsToCsv(pagedReadings)
    )
  }, [page, pagedReadings])

  const exportAllReadings = React.useCallback(() => {
    downloadCsv(
      `${session.id}-rain-gauge-readings.csv`,
      rainGaugeReadingsToCsv(readings)
    )
  }, [readings, session.id])

  const exportCalibration = React.useCallback(() => {
    downloadCsv(
      "rain-gauge-calibration.csv",
      calibrationTrialsToCsv(calibrationTrials)
    )
  }, [calibrationTrials])

  const exportAnalytics = React.useCallback(() => {
    downloadCsv(
      `${session.id}-rain-gauge-analytics.csv`,
      rainGaugeAnalyticsToCsv({ calibration: calibrationSummary, summary })
    )
  }, [calibrationSummary, session.id, summary])

  return {
    exportAllReadings,
    exportAnalytics,
    exportCalibration,
    exportCurrentReadings,
  }
}
