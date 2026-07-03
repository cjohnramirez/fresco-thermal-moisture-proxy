export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--"
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "--"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatDurationFromDeviceMs(value: number | null | undefined) {
  if (!value) {
    return "No tip yet"
  }

  const seconds = Math.floor(value / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}
