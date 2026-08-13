import { createContext, useContext } from 'react'
import type { DjSet } from '@/lib/types'

interface SetContextValue {
  setId: string
  djSet: DjSet
  publicUrl: string
  displayStatus: 'scheduled' | 'live' | 'ended'
  ended: boolean
  qrOpen: boolean
  setQrOpen: (open: boolean) => void
  copied: boolean
  handleCopy: () => Promise<void>
  actionError: string | null
  setActionError: (error: string | null) => void
}

const SetContext = createContext<SetContextValue | null>(null)

export function SetProvider({
  value,
  children,
}: {
  value: SetContextValue
  children: React.ReactNode
}) {
  return <SetContext.Provider value={value}>{children}</SetContext.Provider>
}

export function useSetContext() {
  const context = useContext(SetContext)
  if (!context) {
    throw new Error('useSetContext must be used within SetProvider')
  }
  return context
}
