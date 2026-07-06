"use client"

import * as React from "react"
import { ClockIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  defaultWateredAtLocalValue,
  formatManilaDateTime,
  formatManilaTime,
  manilaLocalInputToIso,
  toManilaDatetimeLocalValue,
  weightSlotsForEvent,
} from "@/lib/experiment/irrigation"
import type { IrrigationEvent } from "@/lib/experiment/types"

type SubmitPayload = Record<string, unknown>

function optionalNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim()
  if (!value) {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function requiredIso(formData: FormData, key: string) {
  return manilaLocalInputToIso(String(formData.get(key)))
}

export function LogWateringDialog({
  defaultWaterTempC,
  onOpenChange,
  onRefreshWaterTemp,
  onSubmit,
  open,
}: {
  defaultWaterTempC: number | null
  onOpenChange: (open: boolean) => void
  onRefreshWaterTemp: () => Promise<number | null>
  onSubmit: (payload: SubmitPayload) => Promise<unknown>
  open: boolean
}) {
  const [submitting, setSubmitting] = React.useState(false)
  const [wateredAt, setWateredAt] = React.useState(defaultWateredAtLocalValue)
  // Seeded once per dialog mount (the parent remounts via `key` on open), so the
  // latest water reading prefills without an effect clobbering later edits.
  const [waterTempC, setWaterTempC] = React.useState(() =>
    defaultWaterTempC === null ? "" : String(defaultWaterTempC)
  )
  const [refreshingWaterTemp, setRefreshingWaterTemp] = React.useState(false)

  const refreshWaterTemp = async () => {
    setRefreshingWaterTemp(true)
    try {
      const value = await onRefreshWaterTemp()
      if (value !== null) {
        setWaterTempC(String(value))
      } else {
        toast.message("No fresh water reading available.")
      }
    } finally {
      setRefreshingWaterTemp(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Watering</DialogTitle>
          <DialogDescription>
            Record the watering time and water amount.
          </DialogDescription>
        </DialogHeader>
        <form
          key={open ? "open" : "closed"}
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            const form = event.currentTarget
            const formData = new FormData(form)
            setSubmitting(true)
            try {
              await onSubmit({
                wateredAt: manilaLocalInputToIso(wateredAt),
                waterL: optionalNumber(formData, "waterL") ?? 2,
                waterTempC: optionalNumber(formData, "waterTempC"),
                note: String(formData.get("note") ?? ""),
              })
              form.reset()
              onOpenChange(false)
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="watering-watered-at">Watered At</FieldLabel>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  id="watering-watered-at"
                  name="wateredAt"
                  type="datetime-local"
                  value={wateredAt}
                  onChange={(event) => setWateredAt(event.target.value)}
                  autoComplete="off"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWateredAt(defaultWateredAtLocalValue())}
                  disabled={submitting}
                >
                  <ClockIcon data-icon="inline-start" />
                  Use Current Time
                </Button>
              </div>
              <FieldDescription>Displayed and entered in Manila time.</FieldDescription>
            </Field>
            <FieldGroup className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="watering-water-l">Water (L)</FieldLabel>
                <Input
                  id="watering-water-l"
                  name="waterL"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  defaultValue="2.00"
                  autoComplete="off"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="watering-water-temp">
                  Water Temp (C)
                </FieldLabel>
                <Input
                  id="watering-water-temp"
                  name="waterTempC"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max="60"
                  autoComplete="off"
                  value={waterTempC}
                  onChange={(event) => setWaterTempC(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refreshWaterTemp}
                  disabled={refreshingWaterTemp || submitting}
                >
                  {refreshingWaterTemp ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RefreshCwIcon data-icon="inline-start" />
                  )}
                  {refreshingWaterTemp ? "Refreshing..." : "Refresh Water Temp"}
                </Button>
                <FieldDescription>
                  Prefilled from the water probe (GPIO 14). Edit or clear if
                  needed.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="watering-note">Note</FieldLabel>
              <Textarea
                id="watering-note"
                name="note"
                rows={3}
                autoComplete="off"
                placeholder="Optional context..."
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Saving..." : "Save Watering"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function LogWeightDialog({
  event,
  onOpenChange,
  onSubmit,
  open,
}: {
  event: IrrigationEvent | null
  onOpenChange: (open: boolean) => void
  onSubmit: (id: string, payload: SubmitPayload) => Promise<unknown>
  open: boolean
}) {
  const [submitting, setSubmitting] = React.useState(false)
  const defaultWeighedAt = React.useMemo(
    () => (open ? toManilaDatetimeLocalValue(new Date()) : ""),
    [open],
  )
  const slotOptions = React.useMemo(
    () => (event && open ? weightSlotsForEvent(event, new Date()) : []),
    [event, open]
  )
  const defaultSlotAt = React.useMemo(
    () =>
      slotOptions.find((slot) => slot.status === "due")?.slotAt ??
      slotOptions.find((slot) => slot.status === "upcoming")?.slotAt ??
      slotOptions.find((slot) => slot.status === "skipped")?.slotAt ??
      slotOptions[0]?.slotAt ??
      "",
    [slotOptions]
  )
  const [selectedSlotAt, setSelectedSlotAt] = React.useState("")
  const effectiveSlotAt =
    selectedSlotAt && slotOptions.some((slot) => slot.slotAt === selectedSlotAt)
      ? selectedSlotAt
      : defaultSlotAt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Checkpoint Weight</DialogTitle>
          <DialogDescription>
            Save one scheduled 10-minute weight into the watering row.
          </DialogDescription>
        </DialogHeader>
        <form
          key={open ? "open" : "closed"}
          className="flex flex-col gap-4"
          onSubmit={async (submitEvent) => {
            submitEvent.preventDefault()
            if (!event || !effectiveSlotAt) {
              return
            }

            const form = submitEvent.currentTarget
            const formData = new FormData(form)
            setSubmitting(true)
            try {
              await onSubmit(event.id, {
                weightLog: {
                  slotAt: effectiveSlotAt,
                  weighedAt: requiredIso(formData, "weighedAt"),
                  massKg: optionalNumber(formData, "massKg"),
                  note: String(formData.get("note") ?? ""),
                },
              })
              form.reset()
              onOpenChange(false)
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="weight-slot">Checkpoint Slot</FieldLabel>
              <Select
                value={effectiveSlotAt}
                onValueChange={(value) => setSelectedSlotAt(value ?? "")}
                disabled={submitting || !event}
              >
                <SelectTrigger id="weight-slot" className="w-full">
                  <SelectValue placeholder="Select checkpoint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {slotOptions.map((slot) => (
                      <SelectItem key={slot.slotAt} value={slot.slotAt}>
                        {formatManilaTime(slot.slotAt)} - {slot.status}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Slots run every 10 minutes until {event ? formatManilaDateTime(event.cutoffAt) : "the cutoff"}.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="weight-mass">
                Weight (kg)
              </FieldLabel>
              <Input
                id="weight-mass"
                name="massKg"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0.5"
                max="20"
                autoComplete="off"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="weight-weighed-at">Weighed At</FieldLabel>
              <Input
                id="weight-weighed-at"
                name="weighedAt"
                type="datetime-local"
                defaultValue={defaultWeighedAt}
                autoComplete="off"
                required
              />
              <FieldDescription>Use the actual time if the checkpoint was late.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="weight-note">Note</FieldLabel>
              <Textarea
                id="weight-note"
                name="note"
                rows={2}
                autoComplete="off"
                placeholder="Optional context..."
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !event || !effectiveSlotAt}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Saving..." : "Save Weight"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
