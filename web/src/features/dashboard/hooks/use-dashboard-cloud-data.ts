"use client"

import * as React from "react"
import useSWR from "swr"

import type {
  DashboardLoadingState,
  IrrigationEventsResponse,
  ReadingQuery,
  ReadingsResponse,
  SummaryResponse,
} from "@/features/dashboard/lib/dashboard-types"
import {
  chartSeries,
  latestByChannel,
  sensorHealth,
  temperatureSpread,
} from "@/lib/experiment/analytics"
import { bucketForChartRange } from "@/lib/experiment/irrigation"
import { normalizeSupabaseRows } from "@/lib/experiment/parser"
import {
  sampleIrrigationEvents,
  sampleSupabaseRows,
} from "@/lib/experiment/sample-data"
import { buildFallbackSummary } from "@/lib/experiment/summary"
import type { ChartRange } from "@/lib/experiment/types"

import {
  EMPTY_EVENTS,
  EMPTY_READINGS,
} from "./dashboard-constants"
import {
  buildEventsKey,
  buildReadingsKey,
  buildSummaryKey,
  fetchJson,
  nextCloudState,
} from "./dashboard-api"

export function useDashboardCloudData({
  bagId,
  chartRange,
  includeArchived,
  readingQuery,
  sampleMode,
  sessionId,
}: {
  bagId: string
  chartRange: ChartRange
  includeArchived: boolean
  readingQuery: ReadingQuery
  sampleMode: boolean
  sessionId: string
}) {
  const chartBucket = bucketForChartRange(chartRange)
  const readingsKey = buildReadingsKey({ readingQuery, sampleMode, sessionId })
  const eventsKey = buildEventsKey({ bagId, includeArchived, sampleMode })
  const summaryKey = buildSummaryKey({ bagId, chartRange, sampleMode })

  const readingsSWR = useSWR<ReadingsResponse>(readingsKey, fetchJson, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })
  const eventsSWR = useSWR<IrrigationEventsResponse>(eventsKey, fetchJson, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })
  const summarySWR = useSWR<SummaryResponse>(summaryKey, fetchJson, {
    keepPreviousData: true,
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
  const loadingState = React.useMemo<DashboardLoadingState>(
    () => ({
      cloudRefreshing:
        !sampleMode &&
        (readingsSWR.isValidating ||
          eventsSWR.isValidating ||
          summarySWR.isValidating),
      eventsLoading: !sampleMode && eventsSWR.isLoading,
      eventsRefreshing:
        !sampleMode && eventsSWR.isValidating && !eventsSWR.isLoading,
      readingsLoading: !sampleMode && readingsSWR.isLoading,
      readingsRefreshing:
        !sampleMode && readingsSWR.isValidating && !readingsSWR.isLoading,
      summaryLoading: !sampleMode && summarySWR.isLoading,
      summaryRefreshing:
        !sampleMode && summarySWR.isValidating && !summarySWR.isLoading,
    }),
    [
      eventsSWR.isLoading,
      eventsSWR.isValidating,
      readingsSWR.isLoading,
      readingsSWR.isValidating,
      sampleMode,
      summarySWR.isLoading,
      summarySWR.isValidating,
    ]
  )
  const latest = React.useMemo(() => latestByChannel(readings), [readings])
  const health = React.useMemo(() => sensorHealth(readings), [readings])
  const spread = React.useMemo(() => temperatureSpread(readings), [readings])
  const tempData = summary?.temperatureSeries ?? chartSeries(readings)
  const pagination = React.useMemo(
    () => ({
      page: readingQuery.page,
      pageSize: readingQuery.pageSize,
      totalRows: sampleMode
        ? sampleSupabaseRows.length
        : readingsSWR.data?.totalRows ?? readingsSWR.data?.rowCount ?? 0,
    }),
    [
      readingQuery.page,
      readingQuery.pageSize,
      readingsSWR.data?.rowCount,
      readingsSWR.data?.totalRows,
      sampleMode,
    ]
  )
  const mutateReadings = readingsSWR.mutate
  const mutateEvents = eventsSWR.mutate
  const mutateSummary = summarySWR.mutate
  const mutateCloudData = React.useCallback(async () => {
    await Promise.all([mutateReadings(), mutateEvents(), mutateSummary()])
  }, [mutateEvents, mutateReadings, mutateSummary])

  return {
    cloudState,
    eventsError: eventsSWR.error,
    health,
    irrigationEvents,
    latest,
    loadingState,
    mutateCloudData,
    pagination,
    readings,
    readingsError: readingsSWR.error,
    spread,
    summary,
    summaryError: summarySWR.error,
    tempData,
  }
}
