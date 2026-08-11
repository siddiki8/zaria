import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'

export function QrModal({
  open,
  onClose,
  url,
}: {
  open: boolean
  onClose: () => void
  url: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 text-center shadow-[0_0_60px_rgba(139,92,246,0.15)]">
        <h2 className="mb-2 text-lg font-bold text-white">Scan to vote</h2>
        <p className="mb-6 text-sm text-white/60">
          Guests can open this link and vote instantly.
        </p>
        <div className="mx-auto mb-6 flex w-fit rounded-2xl bg-white p-4">
          <QRCodeSVG value={url} size={220} />
        </div>
        <p className="mb-6 break-all text-xs text-white/50">{url}</p>
        <Button variant="secondary" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
