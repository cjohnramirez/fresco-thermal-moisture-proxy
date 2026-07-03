import type { ChartConfig } from "@/components/ui/chart"

export const rainChartConfig = {
  rainfallMl: {
    label: "Rainfall (ml)",
    color: "var(--chart-1)",
  },
  rainfallMm: {
    label: "Rainfall (mm)",
    color: "var(--chart-2)",
  },
  rateMlPerMin: {
    label: "Rate (ml/min)",
    color: "var(--chart-3)",
  },
  tips: {
    label: "Tips",
    color: "var(--chart-4)",
  },
  bucket1VolumeMl: {
    label: "Bucket 1",
    color: "var(--chart-1)",
  },
  bucket2VolumeMl: {
    label: "Bucket 2",
    color: "var(--chart-2)",
  },
  pairAverageMl: {
    label: "Pair Average",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig
