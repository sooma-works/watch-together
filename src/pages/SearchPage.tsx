import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Check, Plus, Search, X } from 'lucide-react'
import { AddToListSheet } from '@/components/ListSheets'
import { Poster } from '@/components/Poster'
import { TypeBadge } from '@/components/TypeBadge'
import { useLocate, useMyLists } from '@/data/hooks'
import { searchMedia, trendingMedia, usingDemoCatalog } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { TYPE_LABEL, type Media, type MediaType } from '@/types'

const TYPES: (MediaType | 'all')[] = ['all', 'movie', 'series', 'anime', 'documentary']

function AddButton({ media, onClick }: { media: Media; onClick: () => void }) {
  const { data: located = [] } = useLocate(media.id)
  const added = located.length > 0
  return (
    <button
      onClick={onClick}
      aria-label={added ? 'Ya está en tus listas' : 'Agregar a una lista'}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg transition active:scale-90',
        added ? 'border border-line text-st-completed' : 'bg-fg text-bg',
      )}
    >
      {added ? <Check className="size-5" /> : <Plus className="size-5" strokeWidth={2.5} />}
    </button>
  )
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const targetListId = params.get('lista') ?? undefined
  const [input, setInput] = useState(query)
  const [type, setType] = useState<MediaType | 'all'>('all')
  const [adding, setAdding] = useState<Media | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { data: lists = [] } = useMyLists()
  const target = lists.find((l) => l.id === targetListId)

  // Debounce: el input actualiza ?q= tras una pausa
  useEffect(() => {
    const t = setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (input.trim()) next.set('q', input.trim())
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 300)
    return () => clearTimeout(t)
  }, [input, setParams])

  const results = useQuery({
    queryKey: ['search', query],
    queryFn: ({ signal }) => searchMedia(query, signal),
    enabled: !!query,
    staleTime: 5 * 60_000,
  })
  const trending = useQuery({ queryKey: ['trending'], queryFn: ({ signal }) => trendingMedia(signal), staleTime: 30 * 60_000 })

  const source = query ? results.data : trending.data
  const shown = (source ?? []).filter((m) => type === 'all' || m.type === type)

  function openAdd(m: Media) {
    setAdding(m)
    setSheetOpen(true)
  }

  return (
    <div className="pt-safe">
      <div className="sticky top-0 z-30 bg-bg/90 px-4 pt-7 pb-3 backdrop-blur-md">
        <h1 className="heading text-[2.6rem]">
          Buscar<span className="text-signal">.</span>
        </h1>

        {target && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pr-1.5 pl-3 text-sm">
            <span className="flex-1 truncate">
              <span className="label mr-1.5">Destino</span>
              {target.emoji} <span className="font-medium">{target.name}</span>
            </span>
            <Link to={`/l/${target.id}`} className="rounded-lg bg-fg px-2.5 py-1 font-mono text-[10.5px] tracking-wider text-bg uppercase">
              Listo
            </Link>
            <button
              aria-label="Quitar lista destino"
              onClick={() => setParams((p) => (p.delete('lista'), p), { replace: true })}
              className="flex size-7 items-center justify-center rounded-lg text-dim"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pelis, series, anime, docs…"
            enterKeyHint="search"
            className="h-13 w-full rounded-xl border border-line bg-surface pr-12 pl-12 text-base outline-none placeholder:text-faint focus:border-line-strong"
          />
          {input && (
            <button onClick={() => setInput('')} aria-label="Borrar búsqueda" className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg bg-surface-3">
              <X className="size-4" />
            </button>
          )}
          {results.isFetching && <span className="absolute right-14 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-signal" />}
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
          {TYPES.map((t) => (
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
      </div>

      <div className="px-4">
        {usingDemoCatalog && (
          <p className="mb-4 flex gap-2 rounded-xl border border-dashed border-line px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-dim">
            <span className="text-signal">●</span>
            <span>Catálogo de ejemplo. Configurá VITE_TMDB_TOKEN para buscar en TMDB.</span>
          </p>
        )}

        {results.isError && <p className="py-8 text-center text-sm text-destructive">No pudimos buscar. Revisá tu conexión.</p>}

        {query ? (
          !results.isFetching && shown.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-3 text-sm text-dim">Nada para “{query}”.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {shown.map((m, i) => (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="flex items-center gap-3 border-b border-line py-2.5 active:bg-surface"
                  onClick={() => openAdd(m)}
                >
                  <div className="w-14 shrink-0">
                    <Poster media={m} compact className="rounded-md" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium tracking-tight">{m.title}</p>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-dim">
                      <TypeBadge type={m.type} />
                      {m.year}
                    </div>
                    {m.overview && <p className="mt-1 line-clamp-2 text-xs text-dim">{m.overview}</p>}
                  </div>
                  <AddButton media={m} onClick={() => openAdd(m)} />
                </motion.li>
              ))}
            </ul>
          )
        ) : (
          <>
            <h2 className="label mb-3">
              {usingDemoCatalog ? 'Ideas para arrancar' : 'Tendencias de la semana'}
            </h2>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4">
              {trending.isLoading && Array.from({ length: 9 }, (_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />)}
              {shown.map((m, i) => (
                <motion.button
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openAdd(m)}
                  className="text-left"
                >
                  <Poster media={m} />
                  <p className="mt-2 line-clamp-1 text-[13px] font-medium tracking-tight">{m.title}</p>
                  <p className="font-mono text-[10px] tracking-wide text-faint uppercase">{TYPE_LABEL[m.type]}</p>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      <AddToListSheet media={adding} open={sheetOpen} onOpenChange={setSheetOpen} defaultListId={targetListId} />
    </div>
  )
}
