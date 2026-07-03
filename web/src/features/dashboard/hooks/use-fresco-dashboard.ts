"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  DEFAULT_BAG_ID,
  DEFAULT_CHART_RANGE,
} from "@/lib/experiment/irrigation"
import { createSessionId } from "@/lib/experiment/storage"
import type { ChartRange } from "@/lib/experiment/types"
import type { View } from "@/features/dashboard/lib/dashboard-types"

import { INITIAL_SESSION_ID } from "./dashboard-constants"
import { useDashboardCloudData } from "./use-dashboard-cloud-data"
import { useIrrigationActions } from "./use-irrigation-actions"
import { useReadingQuery } from "./use-reading-query"
import { useWateringStatus } from "./use-watering-status"
import { useWeekAnalysis } from "./use-week-analysis"

export function useFrescoDashboard() {
  const [sessionId, setSessionId] = React.useState(INITIAL_SESSION_ID)
  const [activeView, setActiveView] = React.useState<View>("dashboard")
  const [bagId] = React.useState(DEFAULT_BAG_ID)
  const [chartRange, setChartRange] =
    React.useState<ChartRange>(DEFAULT_CHART_RANGE)
  const [includeArchived, setIncludeArchived] = React.useState(false)
  const [sampleMode, setSampleMode] = React.useState(false)
  const { readingQuery, resetReadingQuery, updateReadingQuery } =
    useReadingQuery()
  const {
    resetWeekAnalysis,
    runWeekAnalysis,
    setWeekRange,
    weekAnalysis,
    weekAnalysisState,
    weekRange,
  } = useWeekAnalysis({ bagId, setSampleMode })
  const {
    cloudState,
    eventsError,
    health,
    irrigationEvents,
    latest,
    loadingState,
    mutateCloudData,
    pagination,
    readings,
    readingsError,
    spread,
    summary,
    summaryError,
    tempData,
  } = useDashboardCloudData({
    bagId,
    chartRange,
    includeArchived,
    readingQuery,
    sampleMode,
    sessionId,
  })
  const wateringStatus = useWateringStatus(irrigationEvents)
  const {
    archiveIrrigationEvent,
    createIrrigationEvent,
    updateIrrigationEvent,
  } = useIrrigationActions({ bagId, mutateCloudData })

  const refreshFromSupabase = React.useCallback(async () => {
    setSampleMode(false)
    await mutateCloudData()
    toast.success("Supabase data refreshed")
  }, [mutateCloudData])

  const loadSample = React.useCallback(() => {
    setSampleMode(true)
    resetWeekAnalysis()
    toast.success("Loaded sample rows")
  }, [resetWeekAnalysis])

  const resetSession = React.useCallback(() => {
    setSessionId(createSessionId())
    resetReadingQuery()
    setSampleMode(false)
    resetWeekAnalysis()
    toast.message("Started a fresh dashboard session")
  }, [resetReadingQuery, resetWeekAnalysis])

  return {
    activeView,
    archiveIrrigationEvent,
    bagId,
    chartRange,
    cloudState,
    createIrrigationEvent,
    eventsError,
    health,
    includeArchived,
    irrigationEvents,
    latest,
    loadingState,
    loadSample,
    pagination,
    readingQuery,
    readings,
    readingsError,
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
    summaryError,
    tempData,
    updateIrrigationEvent,
    updateReadingQuery,
    wateringStatus,
    weekAnalysis,
    weekAnalysisState,
    weekRange,
  }
}
