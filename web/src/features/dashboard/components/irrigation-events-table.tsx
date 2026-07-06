"use client"

import * as React from "react"
import {
  ArchiveIcon,
  CheckIcon,
  ListChecksIcon,
  PencilIcon,
  XIcon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { TableRowsSkeleton } from "@/features/dashboard/components/loading-states"
import { IrrigationEventDetailsDialog } from "@/features/dashboard/components/irrigation-event-details-dialog"
import {
  formatManilaDateTime,
  formatManilaTime,
  latestWeightLog,
  manilaLocalInputToIso,
  toManilaDatetimeLocalValue,
  weightSlotSummary,
} from "@/lib/experiment/irrigation"
import type { IrrigationEvent } from "@/lib/experiment/types"

function optionalNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim()
  if (!value) {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function EventStatusBadge({
  event,
  now,
}: {
  event: IrrigationEvent
  now: Date
}) {
  if (event.archivedAt) {
    return <Badge variant="secondary">Archived</Badge>
  }

  const summary = weightSlotSummary(event, now)

  if (now.getTime() >= Date.parse(event.cutoffAt)) {
    return summary.skippedCount > 0 ? (
      <Badge variant="secondary">Complete With Skips</Badge>
    ) : (
      <Badge>Complete</Badge>
    )
  }

  if (summary.dueCount > 0) {
    return <Badge variant="secondary">Due</Badge>
  }

  return <Badge variant="outline">Open</Badge>
}

function IrrigationEventEditRow({
  event,
  onCancel,
  onSave,
}: {
  event: IrrigationEvent
  onCancel: () => void
  onSave: (id: string, payload: Record<string, unknown>) => Promise<unknown>
}) {
  const [saving, setSaving] = React.useState(false)

  return (
    <TableRow>
      <TableCell colSpan={7}>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (submitEvent) => {
            submitEvent.preventDefault()
            const formData = new FormData(submitEvent.currentTarget)
            setSaving(true)
            try {
              await onSave(event.id, {
                wateredAt: manilaLocalInputToIso(
                  String(formData.get("wateredAt"))
                ),
                waterL: optionalNumber(formData, "waterL") ?? event.waterL,
                waterTempC: optionalNumber(formData, "waterTempC"),
                note: String(formData.get("note") ?? ""),
              })
              onCancel()
            } finally {
              setSaving(false)
            }
          }}
        >
          <FieldGroup className="grid gap-3 md:grid-cols-4">
            <Field>
              <FieldLabel htmlFor={`event-${event.id}-watered-at`}>
                Watered At
              </FieldLabel>
              <Input
                id={`event-${event.id}-watered-at`}
                name="wateredAt"
                type="datetime-local"
                defaultValue={toManilaDatetimeLocalValue(event.wateredAt)}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`event-${event.id}-water-l`}>
                Water (L)
              </FieldLabel>
              <Input
                id={`event-${event.id}-water-l`}
                name="waterL"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                defaultValue={event.waterL.toFixed(2)}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`event-${event.id}-water-temp`}>
                Water Temp (C)
              </FieldLabel>
              <Input
                id={`event-${event.id}-water-temp`}
                name="waterTempC"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max="60"
                defaultValue={event.waterTempC ?? ""}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`event-${event.id}-note`}>Note</FieldLabel>
              <Textarea
                id={`event-${event.id}-note`}
                name="note"
                defaultValue={event.note}
                rows={2}
                autoComplete="off"
              />
            </Field>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              <XIcon data-icon="inline-start" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {saving ? "Saving..." : "Save Event"}
            </Button>
          </div>
        </form>
      </TableCell>
    </TableRow>
  )
}

export function IrrigationEventsTable({
  events,
  includeArchived,
  loading = false,
  onArchive,
  onIncludeArchivedChange,
  onUpdate,
  refreshing = false,
}: {
  events: IrrigationEvent[]
  includeArchived: boolean
  loading?: boolean
  onArchive: (id: string) => Promise<void>
  onIncludeArchivedChange: (next: boolean) => void
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<unknown>
  refreshing?: boolean
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [archivingId, setArchivingId] = React.useState<string | null>(null)
  const [detailsId, setDetailsId] = React.useState<string | null>(null)
  const [now, setNow] = React.useState(() => new Date())
  const selectedEvent =
    events.find((event) => event.id === detailsId) ?? null

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {(loading || refreshing) && <Spinner />}
          {events.length} watering events
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={includeArchived}
            disabled={loading}
            onCheckedChange={onIncludeArchivedChange}
          />
          Show archived
        </label>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[56rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Watered</TableHead>
              <TableHead className="text-right">Water</TableHead>
              <TableHead>Cutoff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Weight Logs</TableHead>
              <TableHead className="hidden md:table-cell">Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowsSkeleton columns={7} rows={5} />
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No watering events logged.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => {
                const summary = weightSlotSummary(event, now)
                const latest = latestWeightLog(event)

                return editingId === event.id ? (
                  <IrrigationEventEditRow
                    key={event.id}
                    event={event}
                    onCancel={() => setEditingId(null)}
                    onSave={onUpdate}
                  />
                ) : (
                  <TableRow
                    key={event.id}
                    tabIndex={0}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-label={`Open details for watering on ${formatManilaDateTime(event.wateredAt)}`}
                    onClick={() => setDetailsId(event.id)}
                    onKeyDown={(keyboardEvent) => {
                      if (
                        keyboardEvent.key === "Enter" ||
                        keyboardEvent.key === " "
                      ) {
                        keyboardEvent.preventDefault()
                        setDetailsId(event.id)
                      }
                    }}
                  >
                    <TableCell className="min-w-44">
                      {formatManilaDateTime(event.wateredAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {event.waterL.toFixed(2)} L
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatManilaTime(event.cutoffAt)}
                    </TableCell>
                    <TableCell>
                      <EventStatusBadge event={event} now={now} />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="max-w-full justify-start"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation()
                          setDetailsId(event.id)
                        }}
                      >
                        <ListChecksIcon data-icon="inline-start" />
                        <span className="truncate">
                          {summary.weighedCount}/{summary.totalSlots}
                          {latest ? `; ${latest.massKg.toFixed(3)} kg` : ""}
                        </span>
                      </Button>
                    </TableCell>
                    <TableCell className="hidden max-w-56 truncate md:table-cell">
                      {event.note || "--"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Edit event"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation()
                            setEditingId(event.id)
                          }}
                        >
                          <PencilIcon />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={
                                  archivingId === event.id
                                    ? "Archiving event"
                                    : "Archive event"
                                }
                                disabled={
                                  event.archivedAt !== null ||
                                  archivingId === event.id
                                }
                                onClick={(clickEvent) => {
                                  clickEvent.stopPropagation()
                                }}
                              />
                            }
                          >
                            {archivingId === event.id ? (
                              <Spinner />
                            ) : (
                              <ArchiveIcon />
                            )}
                          </AlertDialogTrigger>
                          <AlertDialogContent
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation()
                            }}
                          >
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive Event</AlertDialogTitle>
                              <AlertDialogDescription>
                                This hides the event from active charts and
                                exports.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={archivingId === event.id}
                                onClick={async () => {
                                  setArchivingId(event.id)
                                  try {
                                    await onArchive(event.id)
                                  } finally {
                                    setArchivingId(null)
                                  }
                                }}
                              >
                                {archivingId === event.id
                                  ? "Archiving..."
                                  : "Archive"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <IrrigationEventDetailsDialog
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsId(null)
          }
        }}
      />
    </div>
  )
}
