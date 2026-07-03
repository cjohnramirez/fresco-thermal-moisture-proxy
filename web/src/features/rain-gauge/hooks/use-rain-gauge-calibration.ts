"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  calibrationConfidence,
  parseCalibrationCsv,
  summarizeCalibrationTrials,
} from "@/lib/rain-gauge/calibration"
import {
  clearCalibrationTrials,
  deleteCalibrationTrial,
  getCalibrationTrials,
  saveCalibrationTrials,
} from "@/lib/rain-gauge/storage"
import type {
  CalibrationSummary,
  CalibrationTrial,
} from "@/lib/rain-gauge/types"

import { EMPTY_TRIALS } from "./rain-gauge-constants"

export type ManualCalibrationInput = {
  bucket1VolumeMl: number
  bucket2VolumeMl: number
  notes?: string
}

// Owns calibration trials and their recomputed summary. Trials come from either
// a CSV import or manual bench measurements; metrics are always recomputed in
// code (summarizeCalibrationTrials), never trusted from a spreadsheet cell.
export function useRainGaugeCalibration({
  setError,
}: {
  setError: (message: string | null) => void
}) {
  const [calibrationTrials, setCalibrationTrials] =
    React.useState<CalibrationTrial[]>(EMPTY_TRIALS)
  const [calibrationSummary, setCalibrationSummary] =
    React.useState<CalibrationSummary | null>(null)
  const [loadingCalibration, setLoadingCalibration] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    getCalibrationTrials()
      .then((storedTrials) => {
        if (cancelled) {
          return
        }
        setCalibrationTrials(storedTrials)
        if (storedTrials.length > 0) {
          setCalibrationSummary(summarizeCalibrationTrials(storedTrials))
        }
      })
      .catch((storageError) => {
        if (!cancelled) {
          setError(
            storageError instanceof Error
              ? storageError.message
              : "Rain gauge calibration could not be read."
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [setError])

  const importCalibrationCsv = React.useCallback(
    async (text: string) => {
      setLoadingCalibration(true)
      try {
        const parsed = parseCalibrationCsv(text)
        setCalibrationTrials(parsed.trials)
        setCalibrationSummary(parsed.summary)
        await saveCalibrationTrials(parsed.trials)
        toast.success("Calibration CSV imported")
      } catch (calibrationError) {
        const message =
          calibrationError instanceof Error
            ? calibrationError.message
            : "Calibration CSV could not be parsed."
        setError(message)
        toast.error(message)
      } finally {
        setLoadingCalibration(false)
      }
    },
    [setError]
  )

  // Records one bench-measured trial: the ml each bucket held when its lever
  // tipped. Appends to the trial set and recomputes the shared metrics.
  const addCalibrationTrial = React.useCallback(
    async ({ bucket1VolumeMl, bucket2VolumeMl, notes }: ManualCalibrationInput) => {
      const sourceRow =
        calibrationTrials.reduce((max, trial) => Math.max(max, trial.sourceRow), 0) +
        1
      const trial: CalibrationTrial = {
        id: `calibration-manual-${Date.now()}-${sourceRow}`,
        sourceRow,
        bucket1VolumeMl,
        bucket2VolumeMl,
        pairAverageMl: Number(
          ((bucket1VolumeMl + bucket2VolumeMl) / 2).toFixed(6)
        ),
        method: "manual",
        notes: notes?.trim() ?? "",
      }
      const next = [...calibrationTrials, trial]
      setCalibrationTrials(next)
      setCalibrationSummary(
        summarizeCalibrationTrials(next, {
          footerNotes: calibrationSummary?.footerNotes,
        })
      )
      try {
        await saveCalibrationTrials([trial])
        toast.success("Calibration trial added")
      } catch (storageError) {
        setError(
          storageError instanceof Error
            ? storageError.message
            : "Calibration trial could not be saved."
        )
        toast.error("Calibration trial could not be saved.")
      }
    },
    [calibrationSummary, calibrationTrials, setError]
  )

  const removeCalibrationTrial = React.useCallback(
    async (id: string) => {
      const next = calibrationTrials.filter((trial) => trial.id !== id)
      setCalibrationTrials(next)
      setCalibrationSummary(
        next.length > 0
          ? summarizeCalibrationTrials(next, {
              footerNotes: calibrationSummary?.footerNotes,
            })
          : null
      )
      try {
        await deleteCalibrationTrial(id)
      } catch (storageError) {
        setError(
          storageError instanceof Error
            ? storageError.message
            : "Calibration trial could not be removed."
        )
      }
    },
    [calibrationSummary, calibrationTrials, setError]
  )

  // Clears every trial (manual and imported) from state and IndexedDB.
  const resetCalibration = React.useCallback(async () => {
    setCalibrationTrials(EMPTY_TRIALS)
    setCalibrationSummary(null)
    try {
      await clearCalibrationTrials()
      toast.success("Calibration data reset")
    } catch (storageError) {
      setError(
        storageError instanceof Error
          ? storageError.message
          : "Calibration data could not be reset."
      )
      toast.error("Calibration data could not be reset.")
    }
  }, [setError])

  const calibration = React.useMemo(
    () =>
      calibrationSummary
        ? {
            summary: calibrationSummary,
            confidence: calibrationConfidence(calibrationSummary),
          }
        : null,
    [calibrationSummary]
  )

  return {
    addCalibrationTrial,
    calibration,
    calibrationSummary,
    calibrationTrials,
    importCalibrationCsv,
    loadingCalibration,
    removeCalibrationTrial,
    resetCalibration,
  }
}
