import {
  DownloadIcon,
  DropletsIcon,
  FileDownIcon,
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
import {
  downloadCsv,
  irrigationEventsToCsv,
  readingsToCsv,
  weekAnalysisToCsv,
} from "@/lib/experiment/csv"
import type {
  IrrigationEvent,
  NormalizedReading,
  WeekAnalysisResult,
} from "@/lib/experiment/types"

export function ExportMenu({
  irrigationEvents,
  readings,
  sessionId,
  weekAnalysis,
}: {
  irrigationEvents: IrrigationEvent[]
  readings: NormalizedReading[]
  sessionId: string
  weekAnalysis: WeekAnalysisResult | null
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
        <DownloadIcon data-icon="inline-start" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>CSV Exports</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() =>
              downloadCsv(
                `${sessionId}-current-temperature-page.csv`,
                readingsToCsv(readings)
              )
            }
          >
            <TableIcon />
            Current Readings Page
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              downloadCsv(
                `${sessionId}-irrigation-events.csv`,
                irrigationEventsToCsv(irrigationEvents)
              )
            }
          >
            <DropletsIcon />
            Active Irrigation Events
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!weekAnalysis}
            onClick={() => {
              if (!weekAnalysis) {
                toast.message("Parse the full week before exporting analysis.")
                return
              }

              downloadCsv(
                `${sessionId}-full-week-analysis.csv`,
                weekAnalysisToCsv(weekAnalysis)
              )
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
