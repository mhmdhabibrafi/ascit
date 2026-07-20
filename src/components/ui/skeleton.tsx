import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "rounded-md bg-gradient-to-r from-slate-100/80 via-slate-200/80 to-slate-100/80 bg-[length:200%_100%] animate-[shimmer_2s_infinite_linear]", 
        className
      )} 
    />
  );
}

/**
 * Predefined skeleton layout for metric cards grid.
 */
export function MetricSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <div className="flex min-h-[96px] flex-col items-center justify-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * Predefined skeleton for table/list loading.
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 grid gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Card skeleton for charts/dashboard.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-md border border-slate-200 bg-white p-4 shadow-panel", className)}>
      <div className="grid gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    </div>
  );
}
