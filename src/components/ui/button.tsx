import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_25%,transparent)] hover:bg-[var(--accent-hover)] hover:shadow-[0_0_32px_color-mix(in_srgb,var(--accent)_40%,transparent)] active:scale-[0.98]',
        secondary:
          'border border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/15 active:scale-[0.98]',
        ghost:
          'text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98]',
        danger:
          'border border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-400/50 hover:bg-red-500/25 active:scale-[0.98]',
      },
      size: {
        default: 'h-11 px-5 text-sm',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
