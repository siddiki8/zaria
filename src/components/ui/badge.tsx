import { cn } from '@/lib/utils'

export function Badge({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        className,
      )}
    >
      {children}
    </span>
  )
}
