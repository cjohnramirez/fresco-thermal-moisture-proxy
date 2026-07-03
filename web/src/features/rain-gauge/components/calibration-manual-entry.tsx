"use client"

import * as React from "react"
import { PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber } from "@/features/rain-gauge/lib/format"
import type { RainGaugeDashboardState } from "@/features/rain-gauge/hooks/use-rain-gauge-dashboard"

function parseMl(value: string) {
  const parsed = Number(value)
  return value.trim() !== "" && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null
}

// Manual calibration: the user pours a measured volume into each bucket until
// its lever tips, and records those two millilitre readings as one trial. The
// same metrics that a CSV import feeds are recomputed from these rows.
export function CalibrationManualEntry({
  rain,
}: {
  rain: RainGaugeDashboardState
}) {
  const [bucket1, setBucket1] = React.useState("")
  const [bucket2, setBucket2] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const bucket1Ml = parseMl(bucket1)
  const bucket2Ml = parseMl(bucket2)
  const pairAverageMl =
    bucket1Ml !== null && bucket2Ml !== null
      ? (bucket1Ml + bucket2Ml) / 2
      : null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (bucket1Ml === null || bucket2Ml === null) {
      setFormError("Enter a positive millilitre value for both buckets.")
      return
    }

    setFormError(null)
    setPending(true)
    try {
      await rain.addCalibrationTrial({
        bucket1VolumeMl: bucket1Ml,
        bucket2VolumeMl: bucket2Ml,
        notes,
      })
      setBucket1("")
      setBucket2("")
      setNotes("")
    } finally {
      setPending(false)
    }
  }

  const trials = rain.calibrationTrials

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle>Manual Calibration</CardTitle>
            <CardDescription>
              Measure the water each bucket holds when its lever tips, then
              record both readings as one trial. Metrics update from every trial
              below.
            </CardDescription>
          </div>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={trials.length === 0}
                />
              }
            >
              <RotateCcwIcon data-icon="inline-start" />
              Reset Data
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset calibration data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes all {trials.length} calibration trial
                  {trials.length === 1 ? "" : "s"} (manual and imported) from
                  this browser. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await rain.resetCalibration()
                    setConfirmOpen(false)
                  }}
                >
                  Reset Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bucket1-ml">Bucket 1 (ml)</FieldLabel>
                <Input
                  id="bucket1-ml"
                  name="bucket1-ml"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="2.0"
                  value={bucket1}
                  onChange={(event) => setBucket1(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bucket2-ml">Bucket 2 (ml)</FieldLabel>
                <Input
                  id="bucket2-ml"
                  name="bucket2-ml"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="2.4"
                  value={bucket2}
                  onChange={(event) => setBucket2(event.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="trial-notes">Notes (optional)</FieldLabel>
              <Input
                id="trial-notes"
                name="trial-notes"
                type="text"
                placeholder="e.g. 5ml syringe, slow pour"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <FieldDescription>
                {pairAverageMl !== null
                  ? `Pair average: ${formatNumber(pairAverageMl)} ml per tip`
                  : "Pair average appears once both buckets have a value."}
              </FieldDescription>
            </Field>
          </FieldGroup>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}

          <div>
            <Button type="submit" disabled={pending}>
              <PlusIcon data-icon="inline-start" />
              Add Trial
            </Button>
          </div>
        </form>

        <div className="flex items-baseline justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Total collected across {trials.length} trial
            {trials.length === 1 ? "" : "s"}
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatNumber(rain.calibrationSummary?.totalVolumeMl ?? 0)} ml
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Bucket 1 (ml)</TableHead>
                <TableHead>Bucket 2 (ml)</TableHead>
                <TableHead>Pair Avg (ml)</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trials.length > 0 ? (
                trials.map((trial) => (
                  <TableRow key={trial.id}>
                    <TableCell>{trial.sourceRow}</TableCell>
                    <TableCell>{formatNumber(trial.bucket1VolumeMl)}</TableCell>
                    <TableCell>{formatNumber(trial.bucket2VolumeMl)}</TableCell>
                    <TableCell>{formatNumber(trial.pairAverageMl)}</TableCell>
                    <TableCell>{trial.method || "csv"}</TableCell>
                    <TableCell className="max-w-40 truncate">
                      {trial.notes || "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove trial ${trial.sourceRow}`}
                        onClick={() => rain.removeCalibrationTrial(trial.id)}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No calibration trials yet. Add a manual measurement or import
                    a CSV.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
