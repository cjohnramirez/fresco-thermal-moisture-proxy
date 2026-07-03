"use client"

import * as React from "react"
import { toast } from "sonner"

import type {
  RainGaugeReading,
  RainGaugeSession,
  RainGaugeSyncState,
} from "@/lib/rain-gauge/types"

const INITIAL_SYNC_STATE: RainGaugeSyncState = {
  status: "idle",
  queued: 0,
  synced: 0,
  failed: 0,
  message: "Not synced.",
}

// Owns the optional, manual push of local readings to Supabase. A missing
// server config is a first-class `not_configured` state, not an error.
export function useRainGaugeSync({
  readings,
  session,
}: {
  readings: RainGaugeReading[]
  session: RainGaugeSession
}) {
  const [syncState, setSyncState] =
    React.useState<RainGaugeSyncState>(INITIAL_SYNC_STATE)
  const [loadingSync, setLoadingSync] = React.useState(false)

  const syncToSupabase = React.useCallback(async () => {
    setLoadingSync(true)
    setSyncState((current) => ({
      ...current,
      status: "syncing",
      queued: readings.length,
      message: "Syncing rain gauge readings...",
    }))

    try {
      const response = await fetch("/api/rain-gauge/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, readings }),
      })
      const payload = (await response.json()) as {
        ok: boolean
        code?: string
        message?: string
        synced?: number
        failed?: number
      }

      if (!response.ok || !payload.ok) {
        if (payload.code === "not_configured") {
          setSyncState({
            status: "not_configured",
            queued: readings.length,
            synced: 0,
            failed: 0,
            message: "Supabase is not configured for rain gauge sync.",
          })
          return
        }
        throw new Error(payload.message ?? "Rain gauge sync failed.")
      }

      setSyncState({
        status: "synced",
        queued: 0,
        synced: payload.synced ?? readings.length,
        failed: payload.failed ?? 0,
        message: "Rain gauge readings synced.",
      })
      toast.success("Rain gauge readings synced")
    } catch (syncError) {
      const message =
        syncError instanceof Error ? syncError.message : "Rain gauge sync failed."
      setSyncState({
        status: "error",
        queued: readings.length,
        synced: 0,
        failed: readings.length,
        message,
      })
      toast.error(message)
    } finally {
      setLoadingSync(false)
    }
  }, [readings, session])

  return {
    loadingSync,
    syncState,
    syncToSupabase,
  }
}
