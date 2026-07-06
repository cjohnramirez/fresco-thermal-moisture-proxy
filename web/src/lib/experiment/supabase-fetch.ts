import type { SupabaseClient } from "@supabase/supabase-js"

import {
  IRRIGATION_EVENT_SELECT,
  normalizeIrrigationEventRow,
  type SupabaseIrrigationEventRow,
} from "./irrigation"
import { normalizeSupabaseRows } from "./parser"
import type {
  IrrigationEvent,
  NormalizedReading,
  SupabaseTemperatureRow,
} from "./types"

const TEMPERATURE_BATCH_SIZE = 1000

export async function fetchTemperatureRowsInRange({
  from,
  sessionId,
  supabase,
  to,
}: {
  from: string
  sessionId: string
  supabase: SupabaseClient
  to: string
}) {
  const rows: SupabaseTemperatureRow[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from("temperature_readings")
      .select("id,created_at,payload")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })
      .range(offset, offset + TEMPERATURE_BATCH_SIZE - 1)

    if (error) {
      throw new Error(error.message)
    }

    const batch = (data ?? []) as SupabaseTemperatureRow[]
    rows.push(...batch)

    if (batch.length < TEMPERATURE_BATCH_SIZE) {
      break
    }

    offset += TEMPERATURE_BATCH_SIZE
  }

  return {
    rows,
    readings: normalizeSupabaseRows(rows, sessionId) as NormalizedReading[],
  }
}

export async function fetchIrrigationEventsInRange({
  bagId,
  from,
  includeArchived = false,
  supabase,
  to,
}: {
  bagId: string
  from?: string
  includeArchived?: boolean
  supabase: SupabaseClient
  to?: string
}) {
  let query = supabase
    .from("irrigation_events")
    .select(IRRIGATION_EVENT_SELECT)
    .eq("bag_id", bagId)
    .order("watered_at", { ascending: true })

  if (!includeArchived) {
    query = query.is("archived_at", null)
  }
  if (from) {
    query = query.gte("watered_at", from)
  }
  if (to) {
    query = query.lte("watered_at", to)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as SupabaseIrrigationEventRow[]).map(
    normalizeIrrigationEventRow
  ) satisfies IrrigationEvent[]
}
