import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function MetricCard({
  detail,
  icon: Icon,
  label,
  loading = false,
  value,
}: {
  detail: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  loading?: boolean
  value: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <CardDescription className="min-w-0 wrap-break-word">{label}</CardDescription>
          <Icon aria-hidden="true" className="text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl">
          {loading ? <Skeleton className="h-8 w-24" /> : value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <p className="wrap-break-word text-sm text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  )
}
