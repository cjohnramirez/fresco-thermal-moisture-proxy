"use client"

import * as React from "react"
import { ClockIcon } from "lucide-react"

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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  defaultWateredAtLocalValue,
  manilaLocalInputToIso,
  toManilaDatetimeLocalValue,
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
  onOpenChange,
  onSubmit,
  open,
}: {
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: SubmitPayload) => Promise<unknown>
  open: boolean
}) {
  const [submitting, setSubmitting] = React.useState(false)
  const [wateredAt, setWateredAt] = React.useState(defaultWateredAtLocalValue)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Watering</DialogTitle>
          <DialogDescription>
            Record the watering time, water amount, and bag mass readings.
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
                preMassKg: optionalNumber(formData, "preMassKg"),
                postMassKg: optionalNumber(formData, "postMassKg"),
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
                />
              </Field>
            </FieldGroup>
            <FieldGroup className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="watering-pre-mass">
                  Pre-Water Mass (kg)
                </FieldLabel>
                <Input
                  id="watering-pre-mass"
                  name="preMassKg"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0.5"
                  max="20"
                  autoComplete="off"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="watering-post-mass">
                  Post-Water Mass (kg)
                </FieldLabel>
                <Input
                  id="watering-post-mass"
                  name="postMassKg"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0.5"
                  max="20"
                  autoComplete="off"
                />
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
  const defaultDrainedAt = React.useMemo(
    () => (open ? toManilaDatetimeLocalValue(new Date()) : ""),
    [open],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log +1 h Weight</DialogTitle>
          <DialogDescription>
            This updates the open watering row with the drained bag mass.
          </DialogDescription>
        </DialogHeader>
        <form
          key={open ? "open" : "closed"}
          className="flex flex-col gap-4"
          onSubmit={async (submitEvent) => {
            submitEvent.preventDefault()
            if (!event) {
              return
            }

            const form = submitEvent.currentTarget
            const formData = new FormData(form)
            setSubmitting(true)
            try {
              await onSubmit(event.id, {
                drainedMassKg: optionalNumber(formData, "drainedMassKg"),
                drainedAt: requiredIso(formData, "drainedAt"),
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
              <FieldLabel htmlFor="weight-drained-mass">
                Drained Mass (kg)
              </FieldLabel>
              <Input
                id="weight-drained-mass"
                name="drainedMassKg"
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
              <FieldLabel htmlFor="weight-drained-at">Logged At</FieldLabel>
              <Input
                id="weight-drained-at"
                name="drainedAt"
                type="datetime-local"
                defaultValue={defaultDrainedAt}
                autoComplete="off"
                required
              />
              <FieldDescription>Use the actual weigh time if it was late.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !event}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Saving..." : "Save Weight"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
