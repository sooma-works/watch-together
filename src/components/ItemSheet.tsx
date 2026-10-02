import { useState } from 'react'
import { motion } from 'motion/react'
import { MessageSquareQuote, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { StatusDot } from '@/components/StatusDot'
import { Btn } from '@/components/Button'
import { Poster } from '@/components/Poster'
import { Sheet, SheetHeader, useSheetView } from '@/components/Sheet'
import { StarRating } from '@/components/StarRating'
import { useToast } from '@/components/Toast'
import { TypeBadge } from '@/components/TypeBadge'
import { RollingNumber } from '@/components/ui/rolling-number'
import { useRemoveItem, useUpdateItem, useUpsertReview } from '@/data/hooks'
import { useMe } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { STATUS_EMOJI, STATUS_LABEL, STATUSES, type Item, type Member, type Review, type Status } from '@/types'

interface Props {
  item: Item | null
  open: boolean
  onOpenChange: (open: boolean) => void
  members: Member[]
  reviews: Review[]
}

export function ItemSheet({ item, open, onOpenChange, members, reviews }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {item && <ItemViews item={item} members={members} reviews={reviews.filter((r) => r.itemId === item.id)} close={() => onOpenChange(false)} />}
    </Sheet>
  )
}

function ItemViews({ item, members, reviews, close }: { item: Item; members: Member[]; reviews: Review[]; close: () => void }) {
  const me = useMe()
  const [view, setView] = useSheetView()
  if (view === 'review') return <ReviewView item={item} review={reviews.find((r) => r.userId === me.id)} back={() => setView('default')} />
  if (view === 'remove') return <RemoveView item={item} back={() => setView('default')} done={close} />
  return <DetailView item={item} members={members} reviews={reviews} />
}

// ---------------------------------------------------------------------------

function DetailView({ item, members, reviews }: { item: Item; members: Member[]; reviews: Review[] }) {
  const me = useMe()
  const [, setView] = useSheetView()
  const updateItem = useUpdateItem(item.listId)
  const toast = useToast()
  const { media } = item
  const episodic = media.type === 'series' || media.type === 'anime'

  const rated = reviews.filter((r) => r.rating)
  const avg = rated.length ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : 0

  function setStatus(status: Status) {
    if (status === item.status) return
    updateItem.mutate({ itemId: item.id, patch: { status } })
    toast({ emoji: STATUS_EMOJI[status], title: `Movido a ${STATUS_LABEL[status]}`, description: media.title })
  }

  function bump(key: 'season' | 'episode', delta: number) {
    const current = item.progress?.[key] ?? (key === 'season' ? 1 : 0)
    const next = Math.max(key === 'season' ? 1 : 0, current + delta)
    const progress = { ...item.progress, [key]: next }
    // Al cambiar de temporada, el episodio vuelve a 1
    if (key === 'season' && delta !== 0) progress.episode = 1
    updateItem.mutate({ itemId: item.id, patch: { progress } })
  }

  // Yo primero, después el resto
  const ordered = [...members].sort((a, b) => Number(b.profile.id === me.id) - Number(a.profile.id === me.id))

  return (
    <div>
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <Poster media={media} />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <SheetHeader title={media.title} className="mb-1" />
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-dim">
            <TypeBadge type={media.type} />
            {media.year && <span>{media.year}</span>}
          </div>
          {media.overview && <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-dim">{media.overview}</p>}
        </div>
      </div>

      {/* Estado compartido */}
      <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg p-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            data-vaul-no-drag=""
            onClick={() => setStatus(s)}
            className={cn(
              'relative h-9 rounded-lg font-mono text-[10.5px] tracking-wider uppercase transition-colors',
              item.status === s ? 'text-bg' : 'text-dim',
            )}
          >
            {item.status === s && (
              <motion.span layoutId={`status-${item.id}`} className="absolute inset-0 rounded-lg bg-fg" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
            )}
            <span className="relative flex items-center justify-center gap-1.5">
              <StatusDot status={s} /> {STATUS_LABEL[s]}
            </span>
          </button>
        ))}
      </div>

      {item.status === 'watching' && episodic && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['season', 'episode'] as const).map((k) => (
            <div key={k} className="flex items-center justify-between rounded-xl border border-line bg-bg px-1.5 py-1.5">
              <button data-vaul-no-drag="" onClick={() => bump(k, -1)} aria-label="Menos" className="flex size-8 items-center justify-center rounded-lg bg-surface-2 active:scale-90">
                <Minus className="size-4" />
              </button>
              <div className="text-center leading-tight">
                <div className="label text-[9.5px]">{k === 'season' ? 'Temporada' : 'Episodio'}</div>
                <div className="font-mono text-lg font-medium tabular-nums">
                  <RollingNumber value={item.progress?.[k] ?? (k === 'season' ? 1 : 0)} />
                </div>
              </div>
              <button data-vaul-no-drag="" onClick={() => bump(k, 1)} aria-label="Más" className="flex size-8 items-center justify-center rounded-lg bg-surface-2 active:scale-90">
                <Plus className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Opiniones: una por persona */}
      <div className="mt-6 flex items-end justify-between">
        <h3 className="label">Opiniones</h3>
        {rated.length > 0 && (
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl leading-none font-medium text-signal tabular-nums">
              <RollingNumber value={avg} precision={1} format={(n) => n.toFixed(1)} />
            </span>
            <span className="label">prom · {rated.length}</span>
          </div>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {ordered.map(({ profile }) => {
          const review = reviews.find((r) => r.userId === profile.id)
          const isMe = profile.id === me.id
          if (isMe && !review?.rating && !review?.comment) {
            return (
              <li key={profile.id}>
                <button
                  data-vaul-no-drag=""
                  onClick={() => setView('review')}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong p-3 text-left active:scale-[0.99]"
                >
                  <Avatar profile={profile} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tu opinión</p>
                    <p className="text-xs text-dim">Poné tu puntaje y un comentario</p>
                  </div>
                  <span className="rounded-lg bg-signal px-2.5 py-1.5 font-mono text-[10.5px] font-medium tracking-wider text-signal-ink uppercase">Calificar</span>
                </button>
              </li>
            )
          }
          return (
            <li key={profile.id} className={cn('rounded-xl border p-3', isMe ? 'border-line-strong bg-surface-2' : 'border-line')}>
              <div className="flex items-center gap-3">
                <Avatar profile={profile} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{isMe ? 'Vos' : profile.name}</p>
                  {review?.rating ? (
                    <StarRating value={review.rating} size="sm" />
                  ) : (
                    <p className="font-mono text-[10.5px] tracking-wide text-faint uppercase">Sin calificar</p>
                  )}
                </div>
                {review?.rating ? <span className="font-mono text-sm tabular-nums">{review.rating.toFixed(1)}</span> : null}
                {isMe && (
                  <button data-vaul-no-drag="" onClick={() => setView('review')} aria-label="Editar mi opinión" className="flex size-8 items-center justify-center rounded-lg border border-line text-dim active:scale-90">
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>
              {review?.comment && (
                <p className="mt-2.5 flex gap-2 border-t border-line pt-2.5 text-[13px] leading-snug text-fg/85">
                  <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0 text-faint" />
                  {review.comment}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <button
        data-vaul-no-drag=""
        onClick={() => setView('remove')}
        className="mx-auto mt-5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-wider text-faint uppercase active:text-destructive"
      >
        <Trash2 className="size-3.5" /> Quitar de la lista
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------

function ReviewView({ item, review, back }: { item: Item; review?: Review; back: () => void }) {
  const [rating, setRating] = useState<number | undefined>(review?.rating)
  const [comment, setComment] = useState(review?.comment ?? '')
  const upsert = useUpsertReview(item.listId)
  const toast = useToast()

  function save() {
    upsert.mutate(
      { itemId: item.id, rating: rating ?? null, comment: comment.trim() || null },
      {
        onSuccess: () => {
          toast({ emoji: '⭐', title: 'Opinión guardada', description: item.media.title })
          back()
        },
      },
    )
  }

  return (
    <div>
      <SheetHeader title="Tu opinión" description={item.media.title} onBack={back} />
      <div className="flex flex-col items-center rounded-xl border border-line bg-bg py-6">
        <StarRating value={rating} onChange={setRating} size="lg" />
        <p className="label mt-3 normal-case tracking-normal">Tocá la mitad de una estrella para medio punto</p>
      </div>
      <textarea
        data-vaul-no-drag=""
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={item.status === 'planned' ? '¿Por qué la querés ver? ¿Quién la recomendó?' : '¿Qué te pareció?'}
        className="mt-3 w-full resize-none rounded-xl border border-line bg-bg p-3.5 text-[15px] outline-none placeholder:text-faint focus:border-line-strong"
      />
      <Btn size="lg" className="mt-4 w-full" onClick={save} disabled={upsert.isPending}>
        {upsert.isPending ? 'Guardando…' : 'Guardar'}
      </Btn>
    </div>
  )
}

function RemoveView({ item, back, done }: { item: Item; back: () => void; done: () => void }) {
  const remove = useRemoveItem(item.listId)
  const toast = useToast()
  return (
    <div>
      <SheetHeader
        title="¿Quitar de la lista?"
        description={`"${item.media.title}" y las opiniones de todos se van a borrar de esta lista.`}
        onBack={back}
      />
      <div className="grid grid-cols-2 gap-2">
        <Btn variant="soft" size="lg" onClick={back}>
          Cancelar
        </Btn>
        <Btn
          variant="danger"
          size="lg"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(item.id, {
              onSuccess: () => {
                toast({ emoji: '🗑️', title: 'Quitado de la lista', description: item.media.title })
                done()
              },
            })
          }
        >
          Quitar
        </Btn>
      </div>
    </div>
  )
}
