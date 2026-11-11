import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-[skeleton_1.4s_ease-in-out_infinite] rounded-lg bg-line/70', className)} />;
}

export function FlightCardSkeleton() {
  return (
    <div className="card p-4 sm:p-5" aria-hidden>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex-1 px-2">
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <FlightCardSkeleton key={i} />
      ))}
    </div>
  );
}
