import { cn } from '@/lib/utils'
import type { Status } from '@/types'

const COLOR: Record<Status, string> = {
  watching: 'bg-st-watching',
  planned: 'bg-st-planned',
  completed: 'bg-st-completed',
}

/** Punto de color por estado; "viendo" titila suave como un indicador en vivo. */
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn('inline-block size-1.5 shrink-0 rounded-full', COLOR[status], className)}
      style={status === 'watching' ? { animation: 'blink 1.6s ease-in-out infinite' } : undefined}
    />
  )
}
