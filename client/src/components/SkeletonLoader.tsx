interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-slate-200 dark:bg-slate-700'
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%]',
    none: ''
  }
  
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  )
}

// Pre-built skeleton components for common use cases
export function JobCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Skeleton variant="rectangular" width={48} height={48} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      
      {/* Title */}
      <Skeleton className="mb-2" height={24} width="80%" />
      
      {/* Company */}
      <Skeleton className="mb-3" height={16} width="60%" />
      
      {/* Location */}
      <Skeleton className="mb-4" height={14} width="50%" />
      
      {/* Description */}
      <div className="space-y-2 mb-4">
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="70%" />
      </div>
      
      {/* Tags */}
      <div className="flex gap-2 mb-4">
        <Skeleton height={28} width={80} className="rounded-full" />
        <Skeleton height={28} width={100} className="rounded-full" />
      </div>
      
      {/* Footer */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
        <Skeleton height={12} width={120} className="mb-3" />
        <Skeleton height={40} width="100%" />
      </div>
    </div>
  )
}

export function SearchBarSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5">
          <Skeleton height={16} width={180} className="mb-2" />
          <Skeleton height={56} width="100%" />
        </div>
        
        <div className="md:col-span-4">
          <Skeleton height={16} width={80} className="mb-2" />
          <Skeleton height={56} width="100%" />
        </div>
        
        <div className="md:col-span-3 flex flex-col justify-end">
          <Skeleton height={56} width="100%" />
        </div>
      </div>
      
      {/* Quick Filters */}
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
        <Skeleton height={14} width={100} className="mb-3" />
        <div className="flex flex-wrap gap-2">
          {[80, 90, 75, 85, 70, 95, 100].map((width, i) => (
            <Skeleton key={i} height={32} width={width} className="rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="flex items-center gap-4 animate-pulse">
      <Skeleton variant="rectangular" width={56} height={56} className="rounded-2xl" />
      <div className="flex-1">
        <Skeleton height={32} width={80} className="mb-1" />
        <Skeleton height={16} width={120} />
      </div>
    </div>
  )
}

