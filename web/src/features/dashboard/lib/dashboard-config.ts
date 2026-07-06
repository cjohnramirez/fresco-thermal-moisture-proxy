import type { ChartConfig } from "@/components/ui/chart"

export const chartConfig = {
  control: {
    label: "Control",
    color: "var(--chart-1)",
  },
  surface: {
    label: "Surface",
    color: "var(--chart-2)",
  },
  roots: {
    label: "Root zone",
    color: "var(--chart-3)",
  },
  bottom: {
    label: "Bottom",
    color: "var(--chart-4)",
  },
  surfaceRoot: {
    label: "Surface - root",
    color: "var(--chart-5)",
  },
  rootBottom: {
    label: "Root - bottom",
    color: "var(--chart-1)",
  },
  finalMassKg: {
    label: "Final mass",
    color: "var(--chart-2)",
  },
  initialMassKg: {
    label: "Initial mass",
    color: "var(--chart-3)",
  },
  massKg: {
    label: "Weight",
    color: "var(--chart-2)",
  },
  waterUseKg: {
    label: "Water use",
    color: "var(--chart-4)",
  },
  drainageKg: {
    label: "Drainage",
    color: "var(--chart-5)",
  },
  swing: {
    label: "Root swing",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig
