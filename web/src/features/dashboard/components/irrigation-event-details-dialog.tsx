"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { chartConfig } from "@/features/dashboard/lib/dashboard-config";
import {
  firstWeightLog,
  formatManilaDateTime,
  formatManilaTime,
  latestWeightLog,
  weightSlotSummary,
  weightSlotsForEvent,
} from "@/lib/experiment/irrigation";
import type {
  IrrigationEvent,
  IrrigationSlotStatus,
} from "@/lib/experiment/types";

function kg(value: number | null | undefined) {
  return value === null || value === undefined
    ? "--"
    : `${value.toFixed(3)} kg`;
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium tabular-nums">
        {value}
      </div>
    </div>
  );
}

function statusBadge(status: IrrigationSlotStatus) {
  if (status === "logged") {
    return <Badge>Logged</Badge>;
  }
  if (status === "due") {
    return <Badge variant="secondary">Due</Badge>;
  }
  if (status === "skipped") {
    return <Badge variant="outline">Skipped</Badge>;
  }
  return <Badge variant="outline">Upcoming</Badge>;
}

function eventStatus(event: IrrigationEvent) {
  if (event.archivedAt) {
    return <Badge variant="secondary">Archived</Badge>;
  }

  const now = new Date();
  const summary = weightSlotSummary(event, now);

  if (now.getTime() >= Date.parse(event.cutoffAt)) {
    return summary.skippedCount > 0 ? (
      <Badge variant="secondary">Complete With Skips</Badge>
    ) : (
      <Badge>Complete</Badge>
    );
  }

  if (summary.dueCount > 0) {
    return <Badge variant="secondary">Due</Badge>;
  }

  return <Badge variant="outline">Open</Badge>;
}

export function IrrigationEventDetailsDialog({
  event,
  onOpenChange,
  open,
}: {
  event: IrrigationEvent | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  if (!event) {
    return null;
  }

  const slots = weightSlotsForEvent(event, new Date());
  const summary = weightSlotSummary(event, new Date());
  const first = firstWeightLog(event);
  const latest = latestWeightLog(event);
  const chartData = event.weightLogs.map((log) => ({
    massKg: log.massKg,
    slot: formatManilaTime(log.slotAt),
    slotAt: log.slotAt,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <div className="flex flex-col gap-2 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <DialogTitle>Irrigation Event Details</DialogTitle>
              <DialogDescription>
                {formatManilaDateTime(event.wateredAt)} to{" "}
                {formatManilaDateTime(event.cutoffAt)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Water" value={`${event.waterL.toFixed(2)} L`} />
          <DetailTile
            label="Water Temp"
            value={
              event.waterTempC === null
                ? "--"
                : `${event.waterTempC.toFixed(1)} C`
            }
          />
          <DetailTile
            label="Expected Slots"
            value={String(summary.totalSlots)}
          />
          <DetailTile
            label="Logged Weights"
            value={`${summary.weighedCount}/${summary.totalSlots}`}
          />
          <DetailTile
            label="Skipped Slots"
            value={String(summary.skippedCount)}
          />
          <DetailTile label="First Weight" value={kg(first?.massKg)} />
          <DetailTile label="Latest Weight" value={kg(latest?.massKg)} />
          <DetailTile label="Cutoff" value={formatManilaTime(event.cutoffAt)} />
        </div>

        <div className="min-w-0 rounded-md border">
          <div className="border-b p-3">
            <h3 className="text-sm font-medium">Weight Trend</h3>
            <p className="text-xs text-muted-foreground">
              Logged mass across checkpoint slots.
            </p>
          </div>
          <div className="p-3">
            {chartData.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="h-72 w-full aspect-auto"
              >
                <LineChart data={chartData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="slot"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tickLine={false} axisLine={false} width={42} domain={[9.5,10]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    dataKey="massKg"
                    type="monotone"
                    stroke="var(--color-massKg)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                No checkpoint weights logged.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-md border">
          <div className="border-b p-3">
            <h3 className="text-sm font-medium">Weight Logs</h3>
            <p className="text-xs text-muted-foreground">
              Slot status is derived from the watering schedule.
            </p>
          </div>
          <div className="overflow-x-auto px-4 py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slot</TableHead>
                  <TableHead>Weighed</TableHead>
                  <TableHead>Mass</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.slotAt}>
                    <TableCell className="tabular-nums">
                      {formatManilaTime(slot.slotAt)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {slot.weightLog
                        ? formatManilaTime(slot.weightLog.weighedAt)
                        : "--"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {kg(slot.weightLog?.massKg)}
                    </TableCell>
                    <TableCell>{statusBadge(slot.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {event.note && (
          <div className="rounded-md border p-3">
            <h3 className="text-sm font-medium">Note</h3>
            <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
