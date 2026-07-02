"use client"

import * as React from "react"
import { ArchiveIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
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
import {
  formatManilaDateTime,
  lateWeighLabel,
  manilaLocalInputToIso,
  toManilaDatetimeLocalValue,
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

function optionalIso(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim()
  return value ? manilaLocalInputToIso(value) : null
}

function MassCell({ value }: { value: number | null }) {
  return (
    <TableCell className="text-right tabular-nums">
      {value === null ? "--" : value.toFixed(3)}
    </TableCell>
  )
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
      <TableCell colSpan={8}>
        <form
          className="grid gap-3 md:grid-cols-6"
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
                preMassKg: optionalNumber(formData, "preMassKg"),
                postMassKg: optionalNumber(formData, "postMassKg"),
                drainedMassKg: optionalNumber(formData, "drainedMassKg"),
                drainedAt: optionalIso(formData, "drainedAt"),
                note: String(formData.get("note") ?? ""),
              })
              onCancel()
            } finally {
              setSaving(false)
            }
          }}
        >
          <Input
            aria-label="Watered at"
            name="wateredAt"
            type="datetime-local"
            defaultValue={toManilaDatetimeLocalValue(event.wateredAt)}
            autoComplete="off"
          />
          <Input
            aria-label="Water liters"
            name="waterL"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            defaultValue={event.waterL.toFixed(2)}
            autoComplete="off"
          />
          <Input
            aria-label="Pre-water mass"
            name="preMassKg"
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0.5"
            max="20"
            defaultValue={event.preMassKg ?? ""}
            autoComplete="off"
          />
          <Input
            aria-label="Post-water mass"
            name="postMassKg"
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0.5"
            max="20"
            defaultValue={event.postMassKg ?? ""}
            autoComplete="off"
          />
          <Input
            aria-label="Drained mass"
            name="drainedMassKg"
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0.5"
            max="20"
            defaultValue={event.drainedMassKg ?? ""}
            autoComplete="off"
          />
          <Input
            aria-label="Drained at"
            name="drainedAt"
            type="datetime-local"
            defaultValue={
              event.drainedAt ? toManilaDatetimeLocalValue(event.drainedAt) : ""
            }
            autoComplete="off"
          />
          <Input
            aria-label="Water temperature"
            name="waterTempC"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="60"
            defaultValue={event.waterTempC ?? ""}
            autoComplete="off"
          />
          <Textarea
            aria-label="Event note"
            name="note"
            defaultValue={event.note}
            className="md:col-span-4"
            autoComplete="off"
          />
          <div className="flex gap-2 md:col-span-1">
            <Button type="submit" size="icon" aria-label="Save event" disabled={saving}>
              <CheckIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Cancel edit"
              onClick={onCancel}
            >
              <XIcon />
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
  onArchive,
  onIncludeArchivedChange,
  onUpdate,
}: {
  events: IrrigationEvent[]
  includeArchived: boolean
  onArchive: (id: string) => Promise<void>
  onIncludeArchivedChange: (next: boolean) => void
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<unknown>
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {events.length} watering events
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={includeArchived}
            onCheckedChange={onIncludeArchivedChange}
          />
          Show archived
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Watered</TableHead>
              <TableHead className="text-right">Water</TableHead>
              <TableHead className="text-right">Pre</TableHead>
              <TableHead className="text-right">Post</TableHead>
              <TableHead className="text-right">Drained</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No watering events logged.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) =>
                editingId === event.id ? (
                  <IrrigationEventEditRow
                    key={event.id}
                    event={event}
                    onCancel={() => setEditingId(null)}
                    onSave={onUpdate}
                  />
                ) : (
                  <TableRow key={event.id}>
                    <TableCell className="min-w-44">
                      {formatManilaDateTime(event.wateredAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {event.waterL.toFixed(2)} L
                    </TableCell>
                    <MassCell value={event.preMassKg} />
                    <MassCell value={event.postMassKg} />
                    <MassCell value={event.drainedMassKg} />
                    <TableCell>
                      {event.archivedAt ? (
                        <Badge variant="secondary">Archived</Badge>
                      ) : event.drainedMassKg === null ? (
                        <Badge variant="outline">Open</Badge>
                      ) : lateWeighLabel(event) ? (
                        <Badge variant="secondary">{lateWeighLabel(event)}</Badge>
                      ) : (
                        <Badge>Closed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-52 truncate">
                      {event.note || "--"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Edit event"
                          onClick={() => setEditingId(event.id)}
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
                                aria-label="Archive event"
                                disabled={event.archivedAt !== null}
                              />
                            }
                          >
                            <ArchiveIcon />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive Event</AlertDialogTitle>
                              <AlertDialogDescription>
                                This hides the event from active charts and exports.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void onArchive(event.id)}
                              >
                                Archive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
