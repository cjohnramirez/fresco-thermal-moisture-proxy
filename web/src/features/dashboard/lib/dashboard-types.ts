import type {
  ExperimentSummary,
  IrrigationEvent,
  NormalizedReading,
  WeekAnalysisResult,
} from "@/lib/experiment/types"

export type View = "dashboard" | "monitor" | "analytics"

export type CloudState = {
  status: "idle" | "loading" | "ready" | "error"
  message: string
  rowCount: number
  latestFetchAt: string | null
}

export type DashboardLoadingState = {
  cloudRefreshing: boolean
  eventsLoading: boolean
  eventsRefreshing: boolean
  readingsLoading: boolean
  readingsRefreshing: boolean
  summaryLoading: boolean
  summaryRefreshing: boolean
}

export type ReadingsResponse = {
  ok: boolean
  readings?: NormalizedReading[]
  rowCount?: number
  totalRows?: number
  page?: number
  pageSize?: number
  message?: string
}

export type IrrigationEventsResponse = {
  ok: boolean
  events?: IrrigationEvent[]
  message?: string
}

export type IrrigationEventResponse = {
  ok: boolean
  event?: IrrigationEvent
  message?: string
}

export type SummaryResponse = ExperimentSummary & {
  message?: string
}

export type WeekAnalysisResponse =
  | WeekAnalysisResult
  | {
      ok: false
      message: string
    }

export type ReadingQuery = {
  channel: string
  page: number
  pageSize: number
  status: string
}
