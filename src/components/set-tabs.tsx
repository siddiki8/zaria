import { Link } from '@tanstack/react-router'
import { ListMusic, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  {
    to: '/sets/$setId' as const,
    label: 'Music',
    icon: ListMusic,
    exact: true,
  },
  {
    to: '/sets/$setId/settings' as const,
    label: 'Settings',
    icon: SlidersHorizontal,
    exact: false,
  },
] as const

const tabBaseClass =
  'flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition'

export function SetTabs({ setId }: { setId: string }) {
  return (
    <nav aria-label="Set sections" className="border-b border-white/8">
      <div className="flex" role="tablist">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ setId }}
            role="tab"
            activeOptions={{ exact: tab.exact }}
            className={cn(
              tabBaseClass,
              'border-transparent text-white/50 hover:text-white/80',
            )}
            activeProps={{
              className: cn(
                tabBaseClass,
                'border-[var(--accent)] text-[var(--accent)]',
              ),
              'aria-selected': true,
            }}
            inactiveProps={{
              className: cn(
                tabBaseClass,
                'border-transparent text-white/50 hover:text-white/80',
              ),
              'aria-selected': false,
            }}
          >
            <tab.icon className="h-4 w-4" aria-hidden />
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
