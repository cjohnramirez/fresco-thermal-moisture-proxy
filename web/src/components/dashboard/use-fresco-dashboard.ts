"use client"

import * as React from "react"
import useSWR from "swr"
import { toast } from "sonner"

import type {
  CloudState,
  IrrigationEventResponse,
  IrrigationEventsResponse,
  ReadingQuery,
  ReadingsResponse,
  SummaryResponse,
  View,
  WeekAnalysisResponse,
} from "@/components/dashboard/dashboard-types"
import {
  chartSeries,
  latestByChannel,
  sensorHealth,
  temperatureSpread,
} from "@/lib/experiment/analytics"
import {
  computeWateringStatus,
  DEFAULT_BAG_ID,
  DEFAULT_CHART_RANGE,
  bucketForChartRange,
  defaultWateredAtLocalValue,
  manilaLocalInputToIso,
  toManilaDatetimeLocalValue,
} from "@/lib/experiment/irrigation"
import { normalizeSupabaseRows } from "@/lib/experiment/parser"
import {
  sampleIrrigationEvents,
  sampleSupabaseRows,
} from "@/lib/experiment/sample-data"
import { createSessionId } from "@/lib/experiment/storage"
import { buildFallbackSummary } from "@/lib/experiment/summary"
import type {
  ChartRange,
  IrrigationEvent,
  NormalizedReading,
  WeekAnalysisResult,
} from "@/lib/experiment/types"

const DEFAULT_READING_QUERY: ReadingQuery = {
  channel: "all",
  page: 1,
  pageSize: 100,
  status: "all",
}

const INITIAL_SESSION_ID = "session-supabase"
const EMPTY_READINGS: NormalizedReading[] = []
const EMPTY_EVENTS: IrrigationEvent[] = []

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const payload = (await response.json()) as T & { message?: string }

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.")
  }

  return payload
}

async function sendJson<T>(url: string, init: RequestInit): Promise<T> {
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

function initialWeekRange() {
  const to = new Date()
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60_000)

  return {
    from: toManilaDatetimeLocalValue(from),
    to: toManilaDatetimeLocalValue(to),
  }
}

function nextCloudState({
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

export function useFrescoDashboard() {
  const [sessionId, setSessionId] = React.useState(INITIAL_SESSION_ID)
  const [activeView, setActiveView] = React.useState<View>("dashboard")
  const [bagId] = React.useState(DEFAULT_BAG_ID)
  const [chartRange, setChartRange] =
    React.useState<ChartRange>(DEFAULT_CHART_RANGE)
  const [readingQuery, setReadingQuery] =
    React.useState<ReadingQuery>(DEFAULT_READING_QUERY)
  const [includeArchived, setIncludeArchived] = React.useState(false)
  const [sampleMode, setSampleMode] = React.useState(false)
  const [weekRange, setWeekRange] = React.useState(initialWeekRange)
  const [weekAnalysis, setWeekAnalysis] =
    React.useState<WeekAnalysisResult | null>(null)
  const [weekAnalysisState, setWeekAnalysisState] = React.useState<CloudState>({
    status: "idle",
    message: "Not parsed",
    rowCount: 0,
    latestFetchAt: null,
  })
  const chartBucket = bucketForChartRange(chartRange)

  const readingsKey = sampleMode
    ? null
    : `/api/readings?${new URLSearchParams({
        channel: readingQuery.channel,
        page: String(readingQuery.page),
        pageSize: String(readingQuery.pageSize),
        sessionId,
        status: readingQuery.status,
      }).toString()}`
  const eventsKey = sampleMode
    ? null
    : `/api/irrigation-events?${new URLSearchParams({
        bagId,
        includeArchived: String(includeArchived),
      }).toString()}`
  const summaryKey = sampleMode
    ? null
    : `/api/experiment-summary?${new URLSearchParams({
        bagId,
        range: chartRange,
      }).toString()}`

  const readingsSWR = useSWR<ReadingsResponse>(readingsKey, fetchJson, {
    revalidateOnFocus: false,
  })
  const eventsSWR = useSWR<IrrigationEventsResponse>(eventsKey, fetchJson, {
    revalidateOnFocus: false,
  })
  const summarySWR = useSWR<SummaryResponse>(summaryKey, fetchJson, {
    revalidateOnFocus: false,
  })

  const sampleReadings = React.useMemo(
    () => normalizeSupabaseRows(sampleSupabaseRows, sessionId),
    [sessionId]
  )
  const readings =
    sampleMode ? sampleReadings : readingsSWR.data?.readings ?? EMPTY_READINGS
  const irrigationEvents =
    sampleMode
      ? sampleIrrigationEvents
      : eventsSWR.data?.events ?? EMPTY_EVENTS
  const summary = sampleMode
    ? buildFallbackSummary(sampleReadings, sampleIrrigationEvents, chartBucket)
    : summarySWR.data?.ok
      ? summarySWR.data
      : null
  const cloudState = nextCloudState({
    data: readingsSWR.data,
    error: readingsSWR.error,
    isLoading: readingsSWR.isLoading,
    sampleMode,
  })
  const latest = React.useMemo(() => latestByChannel(readings), [readings])
  const health = React.useMemo(() => sensorHealth(readings), [readings])
  const spread = React.useMemo(() => temperatureSpread(readings), [readings])
  const tempData = summary?.temperatureSeries ?? chartSeries(readings)
  const hasOpenWeighTimer = React.useMemo(
    () =>
      irrigationEvents.some(
        (event) => event.archivedAt === null && event.drainedMassKg === null
      ),
    [irrigationEvents]
  )
  const [now, setNow] = React.useState(() => Date.now())

  // Tick every second while a +1 h weigh window is open so the countdown
  // advances and rolls over into due/overdue. Idle when nothing is pending.
  React.useEffect(() => {
    if (!hasOpenWeighTimer) {
      return
    }

    setNow(Date.now())
    const timerId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [hasOpenWeighTimer])

  const wateringStatus = React.useMemo(
    () => computeWateringStatus(irrigationEvents, new Date(now)),
    [irrigationEvents, now]
  )

  const mutateCloudData = React.useCallback(async () => {
    await Promise.all([
      readingsSWR.mutate(),
      eventsSWR.mutate(),
      summarySWR.mutate(),
    ])
  }, [eventsSWR, readingsSWR, summarySWR])

  const refreshFromSupabase = React.useCallback(async () => {
    setSampleMode(false)
    await mutateCloudData()
    toast.success("Supabase data refreshed")
  }, [mutateCloudData])

  const loadSample = React.useCallback(() => {
    setSampleMode(true)
    setWeekAnalysis(null)
    toast.success("Loaded sample rows")
  }, [])

  const resetSession = React.useCallback(() => {
    setSessionId(createSessionId())
    setReadingQuery(DEFAULT_READING_QUERY)
    setSampleMode(false)
    setWeekAnalysis(null)
    setWeekAnalysisState({
      status: "idle",
      message: "Not parsed",
      rowCount: 0,
      latestFetchAt: null,
    })
    toast.message("Started a fresh dashboard session")
  }, [])

  const updateReadingQuery = React.useCallback((patch: Partial<ReadingQuery>) => {
    setReadingQuery((current) => ({
      ...current,
      ...patch,
      page:
        patch.channel !== undefined ||
        patch.status !== undefined ||
        patch.pageSize !== undefined
          ? 1
          : patch.page ?? current.page,
    }))
  }, [])

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

  const runWeekAnalysis = React.useCallback(async () => {
    setSampleMode(false)
    setWeekAnalysisState({
      status: "loading",
      message: "Parsing full week",
      rowCount: 0,
      latestFetchAt: null,
    })

    try {
      const payload = await sendJson<WeekAnalysisResponse>("/api/week-analysis", {
        method: "POST",
        body: JSON.stringify({
          bagId,
          from: manilaLocalInputToIso(weekRange.from),
          to: manilaLocalInputToIso(weekRange.to),
        }),
      })

      if (!payload.ok) {
        throw new Error(payload.message)
      }

      setWeekAnalysis(payload)
      setWeekAnalysisState({
        status: "ready",
        message: "Full week parsed",
        rowCount: payload.rowCount,
        latestFetchAt: payload.generatedAt,
      })
      toast.success("Full week parsed")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Full week parse failed."
      setWeekAnalysisState({
        status: "error",
        message,
        rowCount: 0,
        latestFetchAt: null,
      })
      toast.error(message)
    }
  }, [bagId, weekRange])

  return {
    activeView,
    archiveIrrigationEvent,
    bagId,
    chartRange,
    cloudState,
    createIrrigationEvent,
    defaultWateredAtLocalValue,
    eventsError: eventsSWR.error,
    health,
    includeArchived,
    irrigationEvents,
    latest,
    loadSample,
    pagination: {
      page: readingQuery.page,
      pageSize: readingQuery.pageSize,
      totalRows: sampleMode
        ? sampleSupabaseRows.length
        : readingsSWR.data?.totalRows ?? readingsSWR.data?.rowCount ?? 0,
    },
    readingQuery,
    readings,
    readingsError: readingsSWR.error,
    refreshFromSupabase,
    resetSession,
    runWeekAnalysis,
    sampleMode,
    setActiveView,
    setChartRange,
    setIncludeArchived,
    setWeekRange,
    sessionId,
    spread,
    summary,
    summaryError: summarySWR.error,
    tempData,
    updateIrrigationEvent,
    updateReadingQuery,
    wateringStatus,
    weekAnalysis,
    weekAnalysisState,
    weekRange,
  }
}
