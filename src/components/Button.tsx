import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'signal' | 'soft' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-fg text-bg hover:bg-fg/90',
  signal: 'bg-signal text-signal-ink hover:bg-signal/90',
  soft: 'bg-surface-2 text-fg border border-line hover:bg-surface-3',
  ghost: 'text-dim hover:bg-surface-2 hover:text-fg',
  danger: 'border border-destructive/40 text-destructive hover:bg-destructive/10',
}

export const Btn = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'lg' }>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      data-vaul-no-drag=""
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
        size === 'lg' ? 'h-12 px-5 text-[15px]' : 'h-10 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  ),
)
Btn.displayName = 'Btn'
