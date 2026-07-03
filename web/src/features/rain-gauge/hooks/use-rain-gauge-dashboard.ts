"use client"

import * as React from "react"

import { buildRainGaugeSummary } from "@/lib/rain-gauge/analytics"
import { createRainGaugeSessionId } from "@/lib/rain-gauge/storage"
import type {
  RainGaugeChartRange,
  RainGaugeSession,
} from "@/lib/rain-gauge/types"

import {
  createSession,
  readLocalStorage,
  writeLocalStorage,
} from "./rain-gauge-api"
import {
  AP_URL_KEY,
  DEFAULT_AP_BASE_URL,
  SESSION_ID_KEY,
} from "./rain-gauge-constants"
import { useRainGaugeCalibration } from "./use-rain-gauge-calibration"
import { useRainGaugeConnection } from "./use-rain-gauge-connection"
import { useRainGaugeExport } from "./use-rain-gauge-export"
import { useRainGaugeReadings } from "./use-rain-gauge-readings"
import { useRainGaugeSync } from "./use-rain-gauge-sync"

// Composition root for the rain gauge dashboard. It owns the state shared across
// concerns (AP URL, session, chart range, error surface) and wires the focused
// hooks together; each sub-hook owns one slice of behavior.
export function useRainGaugeDashboard() {
  const [apBaseUrl, setApBaseUrlState] = React.useState(() =>
    readLocalStorage(AP_URL_KEY, DEFAULT_AP_BASE_URL)
  )
  const [chartRange, setChartRange] = React.useState<RainGaugeChartRange>("1d")
  const [error, setError] = React.useState<string | null>(null)
  const [session, setSession] = React.useState<RainGaugeSession>(() => {
    const storedUrl = readLocalStorage(AP_URL_KEY, DEFAULT_AP_BASE_URL)
    const storedSessionId = readLocalStorage(
      SESSION_ID_KEY,
      createRainGaugeSessionId()
    )
    return createSession(storedUrl, storedSessionId)
  })

  const setApBaseUrl = React.useCallback((value: string) => {
    setApBaseUrlState(value)
    writeLocalStorage(AP_URL_KEY, value)
  }, [])

  React.useEffect(() => {
    writeLocalStorage(SESSION_ID_KEY, session.id)
  }, [session.id])

  const {
    appendReading,
    loadingInitial,
    page,
    pagedReadings,
    rawPackets,
    readings,
    resetReadings,
    setPage,
    totalPages,
  } = useRainGaugeReadings({ session, setError })

  const {
    connect,
    connectionState,
    disconnect,
    loadingReset,
    loadingStatus,
    refreshStatus,
    resetGauge,
    status,
  } = useRainGaugeConnection({
    apBaseUrl,
    appendReading,
    resetReadings,
    session,
    setError,
    setSession,
  })

  const {
    addCalibrationTrial,
    calibration,
    calibrationSummary,
    calibrationTrials,
    importCalibrationCsv,
    loadingCalibration,
    removeCalibrationTrial,
    resetCalibration,
  } = useRainGaugeCalibration({ setError })

  const summary = React.useMemo(
    () => buildRainGaugeSummary(readings, chartRange),
    [chartRange, readings]
  )

  const { loadingSync, syncState, syncToSupabase } = useRainGaugeSync({
    readings,
    session,
  })

  const {
    exportAllReadings,
    exportAnalytics,
    exportCalibration,
    exportCurrentReadings,
  } = useRainGaugeExport({
    calibrationSummary,
    calibrationTrials,
    page,
    pagedReadings,
    readings,
    session,
    summary,
  })

  const loading = React.useMemo(
    () => ({
      initial: loadingInitial,
      status: loadingStatus,
      reset: loadingReset,
      sync: loadingSync,
      calibration: loadingCalibration,
    }),
    [loadingCalibration, loadingInitial, loadingReset, loadingStatus, loadingSync]
  )

  return {
    addCalibrationTrial,
    apBaseUrl,
    calibration,
    calibrationSummary,
    calibrationTrials,
    chartRange,
    connect,
    connectionState,
    disconnect,
    error,
    exportAllReadings,
    exportAnalytics,
    exportCalibration,
    exportCurrentReadings,
    importCalibrationCsv,
    loading,
    page,
    pagedReadings,
    rawPackets,
    readings,
    refreshStatus,
    removeCalibrationTrial,
    resetCalibration,
    resetGauge,
    session,
    setApBaseUrl,
    setChartRange,
    setPage,
    status,
    summary,
    syncState,
    syncToSupabase,
    totalPages,
  }
}

export type RainGaugeDashboardState = ReturnType<typeof useRainGaugeDashboard>
