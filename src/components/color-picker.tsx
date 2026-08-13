import { useId } from 'react'
import { Check } from 'lucide-react'
import { Input, Label } from '@/components/ui/input'
import { getAccentForeground, normalizeHexColor } from '@/lib/set-theme'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  label: string
  value: string
  swatches: readonly string[]
  onChange: (color: string) => void
  description?: string
}

export function ColorPicker({
  label,
  value,
  swatches,
  onChange,
  description,
}: ColorPickerProps) {
  const inputId = useId()
  const hexId = useId()

  const handleHexChange = (next: string) => {
    const normalized = normalizeHexColor(next)
    if (normalized) onChange(normalized)
  }

  return (
    <div>
      <Label htmlFor={hexId}>{label}</Label>
      {description ? (
        <p className="mb-3 text-sm text-white/50">{description}</p>
      ) : null}
      <div className="flex flex-wrap gap-2" role="list" aria-label={`${label} swatches`}>
        {swatches.map((swatch) => {
          const selected = value.toLowerCase() === swatch.toLowerCase()
          return (
            <button
              key={swatch}
              type="button"
              role="listitem"
              aria-label={`${swatch}${selected ? ', selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onChange(swatch)}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-xl border-2 transition',
                selected
                  ? 'border-white scale-105'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: swatch }}
            >
              {selected ? (
                <Check
                  className="h-4 w-4"
                  style={{ color: getAccentForeground(swatch) }}
                  aria-hidden
                />
              ) : null}
            </button>
          )
        })}
        <label
          htmlFor={inputId}
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/5 text-[10px] font-semibold uppercase tracking-wide text-white/60 hover:border-white/30"
          title="Custom color"
        >
          +
          <input
            id={inputId}
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
      <div className="mt-3">
        <Label htmlFor={hexId} className="sr-only">
          {label} hex value
        </Label>
        <Input
          id={hexId}
          value={value}
          onChange={(event) => handleHexChange(event.target.value)}
          placeholder="#abff4f"
          spellCheck={false}
          maxLength={7}
        />
      </div>
    </div>
  )
}

interface ColorPreviewProps {
  primaryColor: string
  secondaryColor: string
}

export function ColorPreview({ primaryColor, secondaryColor }: ColorPreviewProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10"
      aria-label="Color preview"
    >
      <div
        className="px-4 py-6"
        style={{
          background: `radial-gradient(ellipse at 80% 0%, color-mix(in srgb, ${secondaryColor} 35%, transparent), transparent 60%), radial-gradient(ellipse at 0% 100%, color-mix(in srgb, ${primaryColor} 20%, transparent), transparent 55%), #0a0a0a`,
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
          Guest page preview
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: primaryColor,
              color: getAccentForeground(primaryColor),
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            LIVE
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: primaryColor }}
          >
            #1 Track name
          </span>
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: primaryColor,
            color: getAccentForeground(primaryColor),
          }}
        >
          Vote
        </button>
      </div>
    </div>
  )
}
