import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      aria-label="Loading chart"
      className={cn("h-[280px] w-full rounded-lg", className)}
    />
  )
}

export function TableRowsSkeleton({
  columns,
  rows = 6,
}: {
  columns: number
  rows?: number
}) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <TableRow key={`loading-row-${rowIndex}`} aria-label="Loading row">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <TableCell key={`loading-cell-${rowIndex}-${columnIndex}`}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}
