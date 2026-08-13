import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Copy, QrCode } from 'lucide-react'
import { ColorPicker, ColorPreview } from '@/components/color-picker'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useSetContext } from '@/contexts/set-context'
import { endSet, updateSet } from '@/lib/sets'
import {
  PRIMARY_SWATCHES,
  SECONDARY_SWATCHES,
  normalizeHexColor,
} from '@/lib/set-theme'

export const Route = createFileRoute('/sets/$setId/settings')({
  component: SetSettingsPage,
})

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-white/50">{description}</p>
      ) : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

function SetSettingsPage() {
  const {
    setId,
    djSet,
    publicUrl,
    ended,
    copied,
    handleCopy,
    setQrOpen,
    setActionError,
  } = useSetContext()

  const [name, setName] = useState(djSet.name)
  const [primaryColor, setPrimaryColor] = useState(djSet.primaryColor)
  const [secondaryColor, setSecondaryColor] = useState(djSet.secondaryColor)
  const [savingName, setSavingName] = useState(false)
  const [savingColors, setSavingColors] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [colorsSaved, setColorsSaved] = useState(false)
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    setName(djSet.name)
    setPrimaryColor(djSet.primaryColor)
    setSecondaryColor(djSet.secondaryColor)
  }, [djSet.name, djSet.primaryColor, djSet.secondaryColor])

  const nameDirty = name.trim() !== djSet.name
  const colorsDirty =
    primaryColor !== djSet.primaryColor ||
    secondaryColor !== djSet.secondaryColor

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (!trimmed || !nameDirty) return

    setSavingName(true)
    setActionError(null)
    setNameSaved(false)
    try {
      await updateSet(setId, { name: trimmed })
      setNameSaved(true)
      window.setTimeout(() => setNameSaved(false), 2000)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not save set name.',
      )
    } finally {
      setSavingName(false)
    }
  }

  const handleSaveColors = async () => {
    const normalizedPrimary = normalizeHexColor(primaryColor)
    const normalizedSecondary = normalizeHexColor(secondaryColor)
    if (!normalizedPrimary || !normalizedSecondary || !colorsDirty) return

    setSavingColors(true)
    setActionError(null)
    setColorsSaved(false)
    try {
      await updateSet(setId, {
        primaryColor: normalizedPrimary,
        secondaryColor: normalizedSecondary,
      })
      setColorsSaved(true)
      window.setTimeout(() => setColorsSaved(false), 2000)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not save colors.',
      )
    } finally {
      setSavingColors(false)
    }
  }

  const handleEndSet = async () => {
    if (
      !window.confirm('End this set? Guests will no longer be able to vote.')
    ) {
      return
    }

    setEnding(true)
    setActionError(null)
    try {
      await endSet(setId)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not end this set.',
      )
    } finally {
      setEnding(false)
    }
  }

  return (
    <div className="space-y-6 pt-2">
      <SettingsSection
        title="Set"
        description="The name guests see on your voting page."
      >
        <div>
          <Label htmlFor="set-name">Set name</Label>
          <Input
            id="set-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Friday Night Heat"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => void handleSaveName()}
            disabled={!nameDirty || savingName || !name.trim()}
          >
            {savingName ? 'Saving…' : 'Save name'}
          </Button>
          {nameSaved ? (
            <span className="text-sm text-[var(--accent)]">Saved</span>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Look"
        description="These colors appear on your guest voting page and live controls."
      >
        <ColorPreview
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
        <ColorPicker
          label="Primary color"
          description="Buttons, votes, live indicator, and rankings."
          value={primaryColor}
          swatches={PRIMARY_SWATCHES}
          onChange={setPrimaryColor}
        />
        <ColorPicker
          label="Second color"
          description="Ambient glow and scheduled status accents."
          value={secondaryColor}
          swatches={SECONDARY_SWATCHES}
          onChange={setSecondaryColor}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => void handleSaveColors()}
            disabled={
              !colorsDirty ||
              savingColors ||
              !normalizeHexColor(primaryColor) ||
              !normalizeHexColor(secondaryColor)
            }
          >
            {savingColors ? 'Saving…' : 'Save colors'}
          </Button>
          {colorsSaved ? (
            <span className="text-sm text-[var(--accent)]">Saved</span>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Share"
        description="Send this link or QR code so guests can vote."
      >
        <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
          <p className="break-all text-sm text-white/70">{publicUrl}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void handleCopy()}>
            <Copy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
          <Button variant="secondary" onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" />
            QR code
          </Button>
        </div>
      </SettingsSection>

      {!ended ? (
        <SettingsSection
          title="Danger zone"
          description="Ending a set closes voting for all guests."
        >
          <Button
            variant="danger"
            onClick={() => void handleEndSet()}
            disabled={ending}
          >
            {ending ? 'Ending…' : 'End set'}
          </Button>
        </SettingsSection>
      ) : null}
    </div>
  )
}
