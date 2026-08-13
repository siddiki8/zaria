import { getSetColors, getSetThemeStyle } from '@/lib/set-theme'
import { cn } from '@/lib/utils'

export function SetTheme({
  set,
  className,
  children,
}: {
  set: { primaryColor?: string; secondaryColor?: string }
  className?: string
  children: React.ReactNode
}) {
  const colors = getSetColors(set)

  return (
    <div
      className={cn('set-theme', className)}
      style={getSetThemeStyle(colors)}
    >
      {children}
    </div>
  )
}
