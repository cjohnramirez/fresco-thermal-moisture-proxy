import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="grid min-h-svh gap-4 p-4">
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-3 md:grid-cols-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
