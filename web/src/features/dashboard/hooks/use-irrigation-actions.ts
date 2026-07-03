"use client"

import * as React from "react"
import { toast } from "sonner"

import type { IrrigationEventResponse } from "@/features/dashboard/lib/dashboard-types"

import { sendJson } from "./dashboard-api"

export function useIrrigationActions({
  bagId,
  mutateCloudData,
}: {
  bagId: string
  mutateCloudData: () => Promise<void>
}) {
  const createIrrigationEvent = React.useCallback(
    async (input: Record<string, unknown>) => {
      const payload = await sendJson<IrrigationEventResponse>(
        "/api/irrigation-events",
        {
          method: "POST",
          body: JSON.stringify({ bagId, ...input }),
        }
      )
      await mutateCloudData()
      toast.success("Watering logged")
      return payload.event
    },
    [bagId, mutateCloudData]
  )

  const updateIrrigationEvent = React.useCallback(
    async (id: string, input: Record<string, unknown>) => {
      const payload = await sendJson<IrrigationEventResponse>(
        `/api/irrigation-events/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      )
      await mutateCloudData()
      toast.success("Event updated")
      return payload.event
    },
    [mutateCloudData]
  )

  const archiveIrrigationEvent = React.useCallback(
    async (id: string) => {
      await sendJson<IrrigationEventResponse>(`/api/irrigation-events/${id}`, {
        method: "DELETE",
      })
      await mutateCloudData()
      toast.success("Event archived")
    },
    [mutateCloudData]
  )

  return {
    archiveIrrigationEvent,
    createIrrigationEvent,
    updateIrrigationEvent,
  }
}
