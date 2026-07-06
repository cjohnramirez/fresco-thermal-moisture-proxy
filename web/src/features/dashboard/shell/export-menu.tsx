"use client"

import {
  DownloadIcon,
  DropletsIcon,
  FileDownIcon,
  ScaleIcon,
  TableIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type {
  CloudState,
  DashboardLoadingState,
} from "@/features/dashboard/lib/dashboard-types"
import {
  downloadCsv,
  irrigationEventsToCsv,
  irrigationWeightLogsToCsv,
  readingsToCsv,
  weekAnalysisToCsv,
} from "@/lib/experiment/csv"
import type {
  IrrigationEvent,
  NormalizedReading,
  WeekAnalysisResult,
} from "@/lib/experiment/types"

export function ExportMenu({
  cloudState,
  eventsError,
  irrigationEvents,
  loadingState,
  readings,
  sessionId,
  weekAnalysis,
}: {
  cloudState: CloudState
  eventsError: unknown
  irrigationEvents: IrrigationEvent[]
  loadingState: DashboardLoadingState
  readings: NormalizedReading[]
  sessionId: string
  weekAnalysis: WeekAnalysisResult | null
}) {
  const isPreparing =
    cloudState.status === "loading" ||
    loadingState.readingsLoading ||
    loadingState.eventsLoading
  const errorMessage = getExportErrorMessage(cloudState, eventsError)

  if (isPreparing || errorMessage) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className="inline-flex"
              tabIndex={0}
              aria-label={errorMessage ?? "Preparing CSV exports"}
            />
          }
        >
          <Button
            type="button"
            variant="outline"
            disabled
            aria-label={errorMessage ?? "Preparing CSV exports"}
          >
            {isPreparing ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <DownloadIcon data-icon="inline-start" />
            )}
            {isPreparing ? "Preparing..." : "Export Unavailable"}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-pretty">
          {errorMessage ??
            "Exports are available after Supabase readings and events finish loading."}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
        <DownloadIcon data-icon="inline-start" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="center">
        <DropdownMenuGroup>
          <DropdownMenuLabel>CSV Exports</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              handleCsvExport({
                filename: `${sessionId}-current-temperature-page.csv`,
                content: readingsToCsv(readings),
                label: "Current readings page",
              })
            }
          >
            <TableIcon />
            Current Readings Page
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handleCsvExport({
                filename: `${sessionId}-irrigation-events.csv`,
                content: irrigationEventsToCsv(irrigationEvents),
                label: "Active irrigation events",
              })
            }
          >
            <DropletsIcon />
            Active Irrigation Events
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handleCsvExport({
                filename: `${sessionId}-irrigation-weight-logs.csv`,
                content: irrigationWeightLogsToCsv(irrigationEvents),
                label: "Irrigation weight logs",
              })
            }
          >
            <ScaleIcon />
            Irrigation Weight Logs
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!weekAnalysis}
            onClick={() => {
              if (!weekAnalysis) {
                toast.message("Parse the full week before exporting analysis.")
                return
              }

              handleCsvExport({
                filename: `${sessionId}-full-week-analysis.csv`,
                content: weekAnalysisToCsv(weekAnalysis),
                label: "Full-week analysis",
              })
            }}
          >
            <FileDownIcon />
            Full-Week Analysis
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            toast.message(
              "The readings export uses the current table page. Use Parse Full Week for complete metrics."
            )
          }
        >
          Export Scope
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getExportErrorMessage(cloudState: CloudState, eventsError: unknown) {
  if (cloudState.status === "error") {
    return cloudState.message
  }

  if (eventsError) {
    return eventsError instanceof Error
      ? eventsError.message
      : "Supabase events could not be loaded."
  }

  return null
}

function handleCsvExport({
  content,
  filename,
  label,
}: {
  content: string
  filename: string
  label: string
}) {
  try {
    downloadCsv(filename, content)
    toast.success(`${label} exported`)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "CSV export failed.")
  }
}
