import {
  AlertCircleIcon,
  CloudIcon,
  DropletsIcon,
  RefreshCwIcon,
  ScaleIcon,
} from "lucide-react";

import { formatNumber, labelForChannel } from "@/features/dashboard/lib/format";
import { IrrigationEventsTable } from "@/features/dashboard/components/irrigation-events-table";
import { TableRowsSkeleton } from "@/features/dashboard/components/loading-states";
import { StatusBadge } from "@/features/dashboard/components/status-badge";
import type {
  CloudState,
  DashboardLoadingState,
  ReadingQuery,
} from "@/features/dashboard/lib/dashboard-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CHANNELS,
  type IrrigationEvent,
  type NormalizedReading,
  type WateringStatus,
} from "@/lib/experiment/types";

const readingDateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Manila",
});

export function MonitorView({
  archiveIrrigationEvent,
  cloudState,
  includeArchived,
  irrigationEvents,
  loadingState,
  loadSample,
  onLogWatering,
  onLogWeight,
  pagination,
  readingQuery,
  readings,
  refreshFromSupabase,
  setIncludeArchived,
  updateIrrigationEvent,
  updateReadingQuery,
  wateringStatus,
}: {
  archiveIrrigationEvent: (id: string) => Promise<void>;
  cloudState: CloudState;
  includeArchived: boolean;
  irrigationEvents: IrrigationEvent[];
  loadingState: DashboardLoadingState;
  loadSample: () => void;
  onLogWatering: () => void;
  onLogWeight: () => void;
  pagination: { page: number; pageSize: number; totalRows: number };
  readingQuery: ReadingQuery;
  readings: NormalizedReading[];
  refreshFromSupabase: () => void;
  setIncludeArchived: (next: boolean) => void;
  updateIrrigationEvent: (
    id: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  updateReadingQuery: (patch: Partial<ReadingQuery>) => void;
  wateringStatus: WateringStatus;
}) {
  const pageCount = Math.max(
    1,
    Math.ceil(pagination.totalRows / pagination.pageSize),
  );
  const readingsBusy =
    loadingState.readingsLoading || loadingState.readingsRefreshing;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Supabase Feed</CardTitle>
            <CardDescription>
              Reads Supabase temperature rows one page at a time.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={refreshFromSupabase}
                disabled={loadingState.cloudRefreshing}
              >
                {loadingState.cloudRefreshing ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCwIcon data-icon="inline-start" />
                )}
                {loadingState.cloudRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={loadSample}
                disabled={loadingState.cloudRefreshing}
              >
                Load Sample
              </Button>
            </div>
            <Alert
              variant={
                cloudState.status === "error" ? "destructive" : undefined
              }
            >
              {cloudState.status === "error" ? (
                <AlertCircleIcon aria-hidden="true" />
              ) : (
                <CloudIcon aria-hidden="true" />
              )}
              <AlertTitle>{cloudState.status}</AlertTitle>
              <AlertDescription>{cloudState.message}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Configure Supabase environment variables before using live cloud
              data.
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Watering Controls</CardTitle>
            <CardDescription>
              Log watering and +1 h bag weights to Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onLogWatering}
              disabled={wateringStatus.state !== "idle"}
            >
              <DropletsIcon data-icon="inline-start" />
              Log Watering
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onLogWeight}
              disabled={wateringStatus.state === "idle"}
            >
              <ScaleIcon data-icon="inline-start" />
              Log Weight
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Irrigation Events</CardTitle>
            <CardDescription>
              Edit watering rows, log late weights, or archive bad entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IrrigationEventsTable
              events={irrigationEvents}
              includeArchived={includeArchived}
              loading={loadingState.eventsLoading}
              onArchive={archiveIrrigationEvent}
              onIncludeArchivedChange={setIncludeArchived}
              onUpdate={updateIrrigationEvent}
              refreshing={loadingState.eventsRefreshing}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <CardTitle>Cloud Readings</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 wrap-break-word">
                {readingsBusy && <Spinner />}
                Page {pagination.page} of {pageCount}; {readings.length} channel
                rows shown.
              </CardDescription>
            </div>
            <FieldGroup className="flex flex-row gap-2 justify-end">
              <Field className="md:w-full lg:w-36">
                <FieldLabel
                  htmlFor="reading-channel-filter"
                  className="sr-only"
                >
                  Channel
                </FieldLabel>
                <Select
                  value={readingQuery.channel}
                  onValueChange={(channel) =>
                    updateReadingQuery({ channel: channel ?? "all" })
                  }
                >
                  <SelectTrigger
                    id="reading-channel-filter"
                    aria-label="Filter Channel"
                    className="w-full"
                    disabled={readingsBusy}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Channels</SelectItem>
                      {CHANNELS.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="md:w-full lg:w-36">
                <FieldLabel htmlFor="reading-status-filter" className="sr-only">
                  Status
                </FieldLabel>
                <Select
                  value={readingQuery.status}
                  onValueChange={(status) =>
                    updateReadingQuery({ status: status ?? "all" })
                  }
                >
                  <SelectTrigger
                    id="reading-status-filter"
                    aria-label="Filter Status"
                    className="w-full"
                    disabled={readingsBusy}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ok">Ok</SelectItem>
                      <SelectItem value="no_sensor">No Sensor</SelectItem>
                      <SelectItem value="read_failed">Read Failed</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="md:w-full lg:w-36">
                <FieldLabel htmlFor="reading-page-size" className="sr-only">
                  Rows Per Page
                </FieldLabel>
                <Select
                  value={String(readingQuery.pageSize)}
                  onValueChange={(pageSize) =>
                    updateReadingQuery({ pageSize: Number(pageSize) })
                  }
                >
                  <SelectTrigger
                    id="reading-page-size"
                    aria-label="Rows Per Page"
                    className="w-full"
                    disabled={readingsBusy}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="50">50 Rows</SelectItem>
                      <SelectItem value="100">100 Rows</SelectItem>
                      <SelectItem value="250">250 Rows</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea
            className="h-[min(34rem,calc(100dvh-18rem))] min-h-80 rounded-lg border"
            aria-busy={readingsBusy}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">C</TableHead>
                  <TableHead className="text-right">F</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingState.readingsLoading ? (
                  <TableRowsSkeleton columns={5} rows={8} />
                ) : readings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No readings on this page.
                    </TableCell>
                  </TableRow>
                ) : (
                  readings
                    .slice()
                    .reverse()
                    .map((reading) => (
                      <TableRow key={reading.id}>
                        <TableCell className="text-xs tabular-nums">
                          {readingDateFormatter.format(
                            new Date(reading.receivedAt),
                          )}
                        </TableCell>
                        <TableCell>
                          {labelForChannel(reading.channelId)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={reading.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(reading.celsius)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(reading.fahrenheit)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
                {loadingState.readingsRefreshing && readings.length > 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                        <Spinner />
                        Updating page...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pagination.page <= 1 || readingsBusy}
            onClick={() => updateReadingQuery({ page: pagination.page - 1 })}
          >
            Previous
          </Button>
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            {readingsBusy && <Spinner />}
            {pagination.totalRows} raw rows
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={pagination.page >= pageCount || readingsBusy}
            onClick={() => updateReadingQuery({ page: pagination.page + 1 })}
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
