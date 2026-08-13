import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export function DjNameForm({
  djName,
  onSave,
  disabled,
  showSlugWarning,
}: {
  djName: string
  onSave: (djName: string) => Promise<void>
  disabled?: boolean
  showSlugWarning?: boolean
}) {
  const [value, setValue] = useState(djName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savedTimeout = useRef<number | null>(null)

  useEffect(() => {
    setValue(djName)
  }, [djName])

  useEffect(() => {
    return () => {
      if (savedTimeout.current) window.clearTimeout(savedTimeout.current)
    }
  }, [])

  const trimmed = value.trim()
  const isDirty = trimmed !== djName.trim()
  const canSave = trimmed.length > 0 && isDirty && !disabled && !saving

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!trimmed) {
      setError('Enter your DJ name')
      return
    }

    if (!isDirty) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      await onSave(trimmed)
      setSaved(true)
      if (savedTimeout.current) window.clearTimeout(savedTimeout.current)
      savedTimeout.current = window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save DJ name')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
    >
      <Label htmlFor="dj-name">Your DJ name</Label>
      <p className="mb-3 text-sm text-white/50">
        This is what fans see on your voting page — not your Google account name.
      </p>

      {showSlugWarning ? (
        <p className="mb-3 text-sm text-white/45">
          Changing your DJ name may update your public URL path. Old QR codes and
          links that use the previous path will stop working.
        </p>
      ) : null}

      {djName.trim() ? (
        <p className="mb-3 text-sm text-white/70">
          Currently saved as{' '}
          <span className="font-semibold text-white">{djName}</span>
        </p>
      ) : (
        <p className="mb-3 text-sm text-[var(--accent)]">
          Set a DJ name to create your first set.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          id="dj-name"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
            setSaved(false)
          }}
          placeholder="e.g. DJ Afterglow"
          disabled={disabled || saving}
          className="min-w-[12rem] flex-1"
        />
        <Button
          type="submit"
          variant={saved ? 'default' : 'secondary'}
          disabled={!canSave && !saving}
        >
          {saving ? (
            'Saving…'
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {saved ? (
        <p className="mt-2 text-sm text-[var(--accent)]">
          DJ name saved — it will appear on your public voting page.
        </p>
      ) : null}
      {isDirty && !saving && !saved && trimmed ? (
        <p className="mt-2 text-sm text-white/40">Press Save to update your DJ name.</p>
      ) : null}
    </form>
  )
}
