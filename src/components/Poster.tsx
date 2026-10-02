import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TYPE_LABEL, type Media } from '@/types'

/** Tonos planos y oscuros para los pósters sin imagen. */
const TONES = ['#1d1b19', '#191c1f', '#1c1a1f', '#191e1b', '#1f1a1a', '#1b1b1e']

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

/** Póster de TMDB, o una "ficha" plana con tipo, año y título si no hay imagen. */
export function Poster({
  media,
  className,
  compact,
  eager,
}: {
  media: Media
  className?: string
  compact?: boolean
  /** Cargar ya, aunque esté fuera de pantalla (ej. el carrusel del login). */
  eager?: boolean
}) {
  const [broken, setBroken] = useState(false)
  const base = cn('aspect-[2/3] w-full overflow-hidden rounded-lg border border-line', className)

  if (media.posterUrl && !broken) {
    return <img src={media.posterUrl} alt={media.title} loading={eager ? 'eager' : 'lazy'} onError={() => setBroken(true)} className={cn(base, 'object-cover')} />
  }
  return (
    <div className={cn(base, 'flex flex-col justify-between p-2')} style={{ backgroundColor: TONES[hash(media.id) % TONES.length] }}>
      <div className="flex items-start justify-between font-mono text-[9px] tracking-wider text-faint uppercase">
        <span>{TYPE_LABEL[media.type]}</span>
        {media.year && <span>{media.year}</span>}
      </div>
      {!compact && <span className="text-[13px] leading-[1.1] font-semibold tracking-tight text-fg/90">{media.title}</span>}
    </div>
  )
}
