import { cn } from '@/lib/utils'
import { TYPE_LABEL, type MediaType } from '@/types'

export function TypeBadge({ type, className }: { type: MediaType; className?: string }) {
  return (
    <span className={cn('rounded border border-line px-1.5 py-px font-mono text-[10px] tracking-wider text-dim uppercase', className)}>
      {TYPE_LABEL[type]}
    </span>
  )
}
