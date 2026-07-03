import type {
  CloudState,
  ReadingQuery,
  ReadingsResponse,
} from "@/features/dashboard/lib/dashboard-types"
import {
  sampleSupabaseRows,
} from "@/lib/experiment/sample-data"
import { toManilaDatetimeLocalValue } from "@/lib/experiment/irrigation"
import type { ChartRange } from "@/lib/experiment/types"

const WEEK_MS = 7 * 24 * 60 * 60_000

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const payload = (await response.json()) as T & { message?: string }

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.")
  }

  return payload
}

export async function sendJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const payload = (await response.json()) as T & {
    ok?: boolean
    message?: string
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message ?? "Request failed.")
  }

  return payload
}

export function buildReadingsKey({
  readingQuery,
  sampleMode,
  sessionId,
}: {
  readingQuery: ReadingQuery
  sampleMode: boolean
  sessionId: string
}) {
  if (sampleMode) {
    return null
  }

  return `/api/readings?${new URLSearchParams({
    channel: readingQuery.channel,
    page: String(readingQuery.page),
    pageSize: String(readingQuery.pageSize),
    sessionId,
    status: readingQuery.status,
  }).toString()}`
}

export function buildEventsKey({
  bagId,
  includeArchived,
  sampleMode,
}: {
  bagId: string
  includeArchived: boolean
  sampleMode: boolean
}) {
  if (sampleMode) {
    return null
  }

  return `/api/irrigation-events?${new URLSearchParams({
    bagId,
    includeArchived: String(includeArchived),
  }).toString()}`
}

export function buildSummaryKey({
  bagId,
  chartRange,
  sampleMode,
}: {
  bagId: string
  chartRange: ChartRange
  sampleMode: boolean
}) {
  if (sampleMode) {
    return null
  }

  return `/api/experiment-summary?${new URLSearchParams({
    bagId,
    range: chartRange,
  }).toString()}`
}

export function initialWeekRange() {
  const to = new Date()
  const from = new Date(to.getTime() - WEEK_MS)

  return {
    from: toManilaDatetimeLocalValue(from),
    to: toManilaDatetimeLocalValue(to),
  }
}

export function nextCloudState({
  data,
  error,
  isLoading,
  sampleMode,
}: {
  data?: ReadingsResponse
  error: unknown
  isLoading: boolean
  sampleMode: boolean
}): CloudState {
  if (sampleMode) {
    return {
      status: "ready",
      message: "Sample data loaded",
      rowCount: sampleSupabaseRows.length,
      latestFetchAt: new Date().toISOString(),
    }
  }

  if (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Supabase read failed.",
      rowCount: 0,
      latestFetchAt: null,
    }
  }

  if (isLoading) {
    return {
      status: "loading",
      message: "Loading Supabase rows",
      rowCount: 0,
      latestFetchAt: null,
    }
  }

  return {
    status: "ready",
    message: `${data?.totalRows ?? data?.rowCount ?? 0} Supabase rows available`,
    rowCount: data?.totalRows ?? data?.rowCount ?? 0,
    latestFetchAt: new Date().toISOString(),
  }
}
