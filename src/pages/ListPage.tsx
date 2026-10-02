import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronLeft, Plus, Settings2, Star, UserPlus } from 'lucide-react'
import { AvatarStack } from '@/components/Avatar'
import { ItemSheet } from '@/components/ItemSheet'
import { ListSettingsSheet, ShareSheet } from '@/components/ListSheets'
import { Poster } from '@/components/Poster'
import { DirectionAwareTabs } from '@/components/ui/direction-aware-tabs'
import { useItems, useList, useMembers, useReviews } from '@/data/hooks'
import { useMe } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, STATUSES, TYPE_LABEL, type Item, type MediaType, type Review, type Status } from '@/types'

const EMPTY: Record<Status, { emoji: string; text: string }> = {
  watching: { emoji: '🛋️', text: 'No están viendo nada ahora.' },
  planned: { emoji: '🔖', text: 'Todavía no hay nada pendiente.' },
  completed: { emoji: '🎞️', text: 'Acá van a aparecer las que ya vieron.' },
}

function Tile({ item, reviews, meId, onOpen, index }: { item: Item; reviews: Review[]; meId: string; onOpen: () => void; index: number }) {
  const rated = reviews.filter((r) => r.rating)
  const avg = rated.length ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : null
  const mine = reviews.find((r) => r.userId === meId)
  const p = item.progress
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index, 12) * 0.03 }}
      whileTap={{ scale: 0.95 }}
      onClick={onOpen}
      className="text-left"
    >
      <div className="relative">
        <Poster media={item.media} />
        {avg !== null && (
          <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md bg-bg/90 px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums">
            <Star className="size-2.5 fill-signal text-signal" />
            {avg.toFixed(1)}
          </span>
        )}
        {item.status === 'watching' && (p?.season || p?.episode) ? (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-signal px-1.5 py-0.5 font-mono text-[10px] font-semibold text-signal-ink tabular-nums">
            T{p.season ?? 1}·E{p.episode ?? 0}
          </span>
        ) : null}
        {!mine?.rating && item.status === 'completed' && (
          <span className="absolute bottom-1.5 left-1.5 rounded-md border border-line bg-bg/90 px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider text-dim uppercase">
            Calificá
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-[13px] font-medium tracking-tight">{item.media.title}</p>
      <p className="font-mono text-[10px] tracking-wide text-faint uppercase">
        {TYPE_LABEL[item.media.type]}
        {item.media.year ? ` · ${item.media.year}` : ''}
      </p>
    </motion.button>
  )
}

export function ListPage() {
  const { listId = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const list = useList(listId)
  const { data: members = [] } = useMembers(listId)
  const { data: items = [] } = useItems(listId)
  const { data: reviews = [] } = useReviews(listId)

  const tabIndex = Math.max(0, STATUSES.indexOf((params.get('tab') as Status) ?? 'watching'))
  const [type, setType] = useState<MediaType | 'all'>('all')
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [itemOpen, setItemOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [settings, setSettings] = useState(false)

  // Recién creada: ofrecemos compartirla
  useEffect(() => {
    if ((location.state as { justCreated?: boolean } | null)?.justCreated) {
      setSharing(true)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  const reviewsByItem = useMemo(() => {
    const map = new Map<string, Review[]>()
    reviews.forEach((r) => map.set(r.itemId, [...(map.get(r.itemId) ?? []), r]))
    return map
  }, [reviews])

  const types = useMemo(() => [...new Set(items.map((i) => i.media.type))], [items])

  if (list.isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <p className="text-5xl">🔒</p>
        <p className="mt-4 text-dim">{list.error.message}</p>
        <Link to="/" className="mt-6 font-mono text-xs tracking-wider text-signal uppercase">
          Volver a mis listas
        </Link>
      </div>
    )
  }

  const data = list.data
  const openItem = items.find((i) => i.id === openItemId) ?? null

  const tabs = STATUSES.map((status, id) => {
    const inStatus = items
      .filter((i) => i.status === status && (type === 'all' || i.media.type === type))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const count = items.filter((i) => i.status === status).length
    return {
      id,
      label: (
        <>
          {STATUS_LABEL[status]}
          <span className="tabular-nums opacity-60">{count}</span>
        </>
      ),
      content:
        inStatus.length === 0 ? (
          <div className="mx-1 mt-3 flex flex-col items-center rounded-2xl border border-dashed border-line px-8 py-12 text-center">
            <span className="text-3xl grayscale">{EMPTY[status].emoji}</span>
            <p className="mt-3 text-sm text-dim">{type === 'all' ? EMPTY[status].text : 'Nada de ese tipo acá.'}</p>
            <Link
              to={`/buscar?lista=${listId}`}
              className="mt-5 rounded-xl bg-fg px-4 py-2.5 text-sm font-medium text-bg"
            >
              Buscar algo para agregar
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-4 px-1 pt-2 pb-4">
            {inStatus.map((item, i) => (
              <Tile
                key={item.id}
                item={item}
                index={i}
                meId={me.id}
                reviews={reviewsByItem.get(item.id) ?? []}
                onOpen={() => {
                  setOpenItemId(item.id)
                  setItemOpen(true)
                }}
              />
            ))}
          </div>
        ),
    }
  })

  return (
    <div className="relative">
      <header className="sticky top-0 z-30 bg-bg/90 pt-safe backdrop-blur-md">
        <div className="flex items-center justify-between px-3 py-3">
          <Link to="/" aria-label="Volver" className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface active:scale-90">
            <ChevronLeft className="size-5" />
          </Link>
          <div className="flex gap-2">
            <button onClick={() => setSharing(true)} className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium active:scale-95">
              <UserPlus className="size-4" /> Invitar
            </button>
            <button onClick={() => setSettings(true)} aria-label="Ajustes" className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface active:scale-90">
              <Settings2 className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="px-4 pt-2 pb-5">
        {data ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-2xl">{data.emoji}</span>
              <span className="label">
                {items.length} {items.length === 1 ? 'título' : 'títulos'} · {members.length > 1 ? 'Compartida' : data.isPersonal ? 'Personal' : 'Privada'}
              </span>
            </div>
            <h1 className="heading mt-4 text-[2.6rem]">{data.name}</h1>
            <button onClick={() => setSharing(true)} className="mt-4 flex items-center gap-2">
              <AvatarStack profiles={members.map((m) => m.profile)} size="sm" />
              <span className="text-sm text-dim">
                {members.length > 1 ? `${members.map((m) => (m.profile.id === me.id ? 'vos' : m.profile.name.split(' ')[0])).join(', ')}` : 'Solo vos · tocá Invitar para compartirla'}
              </span>
            </button>
          </motion.div>
        ) : (
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
        )}
      </section>

      {types.length > 1 && (
        <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto px-4">
          {(['all', ...types] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'shrink-0 rounded-lg border px-2.5 py-1 font-mono text-[10.5px] tracking-wider uppercase transition',
                type === t ? 'border-fg bg-fg text-bg' : 'border-line text-dim',
              )}
            >
              {t === 'all' ? 'Todo' : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      <div className="px-3">
        <DirectionAwareTabs
          tabs={tabs}
          value={tabIndex}
          onValueChange={(id) => setParams({ tab: STATUSES[id] }, { replace: true })}
          className="w-full justify-between p-1"
        />
      </div>

      {/* Botón flotante para agregar */}
      <Link
        to={`/buscar?lista=${listId}`}
        aria-label="Agregar título"
        style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        className="fixed right-4 z-30 flex size-13 items-center justify-center rounded-2xl bg-signal text-signal-ink active:scale-90"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </Link>

      <ItemSheet item={openItem} open={itemOpen && !!openItem} onOpenChange={setItemOpen} members={members} reviews={reviews} />
      {data && <ShareSheet list={data} members={members} open={sharing} onOpenChange={setSharing} />}
      {data && <ListSettingsSheet key={`${data.name}${data.emoji}`} list={data} open={settings} onOpenChange={setSettings} />}
    </div>
  )
}
