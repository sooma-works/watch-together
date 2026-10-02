import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, KeyRound, Plus } from 'lucide-react'
import { Avatar, AvatarStack } from '@/components/Avatar'
import { CreateListSheet, JoinCodeSheet } from '@/components/ListSheets'
import { Poster } from '@/components/Poster'
import { StatusDot } from '@/components/StatusDot'
import { useMyLists } from '@/data/hooks'
import { useMe } from '@/lib/auth'
import { STATUSES, type ListSummary, type Status } from '@/types'

const SHORT: Record<Status, string> = { watching: 'Viendo', planned: 'Pend.', completed: 'Vistos' }

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Trasnochando'
  if (h < 13) return 'Buen día'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Abanico de pósters que asoma por el costado de la tarjeta. */
function PosterFan({ list }: { list: ListSummary }) {
  const slots = [
    { rotate: -10, x: -30, y: 10, z: 0 },
    { rotate: 0, x: 0, y: 0, z: 2 },
    { rotate: 10, x: 30, y: 10, z: 1 },
  ]
  return (
    <div className="absolute top-6 -right-2 h-32 w-32">
      {slots.map((s, i) => {
        const media = list.posters[i]
        return (
          <motion.div
            key={i}
            initial={{ rotate: 0, x: 0, y: 16, opacity: 0 }}
            animate={{ rotate: s.rotate, x: s.x, y: s.y, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.3, delay: 0.06 * i }}
            className="absolute left-1/2 w-16 -translate-x-1/2 origin-bottom"
            style={{ zIndex: s.z }}
          >
            {media ? (
              <Poster media={media} compact className="rounded-md" />
            ) : (
              <div className="aspect-[2/3] w-full rounded-md border border-dashed border-line-strong bg-surface" />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

function ListCard({ list, index }: { list: ListSummary; index: number }) {
  const total = STATUSES.reduce((s, k) => s + list.counts[k], 0)
  const shared = list.members.length > 1
  return (
    <motion.li initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index, type: 'spring', bounce: 0.2 }}>
      <Link to={`/l/${list.id}`} className="group block transition-transform active:scale-[0.985]">
        <div className="panel relative h-44 overflow-hidden rounded-2xl p-4">
          <PosterFan list={list} />
          <div className="relative flex h-full max-w-[60%] flex-col">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-lg">{list.emoji}</span>
              <span className="label">
                {String(index + 1).padStart(2, '0')} · {list.isPersonal ? 'Personal' : shared ? 'Compartida' : 'Privada'}
              </span>
            </div>
            <h2 className="heading mt-3 line-clamp-2 text-[1.6rem] leading-[1.02]">{list.name}</h2>
            <div className="mt-auto flex items-center gap-2">
              <AvatarStack profiles={list.members} />
              <span className="font-mono text-[11px] text-dim">
                {shared ? `${list.members.length} personas` : 'Solo vos'}
              </span>
            </div>
            <div className="mt-2.5 flex gap-3 font-mono text-[10.5px] tracking-wide text-dim uppercase tabular-nums">
              {total === 0 ? (
                <span className="text-faint">Vacía</span>
              ) : (
                STATUSES.map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <StatusDot status={s} />
                    <span className="text-fg">{list.counts[s]}</span> {SHORT[s]}
                  </span>
                ))
              )}
            </div>
          </div>
          <ArrowUpRight className="absolute right-3 bottom-3 size-4 text-faint transition group-hover:text-fg" />
        </div>
      </Link>
    </motion.li>
  )
}

export function HomePage() {
  const me = useMe()
  const { data: lists, isLoading } = useMyLists()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  return (
    <div className="px-4 pt-safe">
      <header className="flex items-end justify-between pt-7">
        <div>
          <p className="label">
            {greeting()}, {me.name.split(' ')[0]}
          </p>
          <h1 className="heading mt-2 text-[2.6rem]">
            Tus listas<span className="text-signal">.</span>
          </h1>
        </div>
        <Link to="/perfil" aria-label="Perfil">
          <Avatar profile={me} size="md" />
        </Link>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          onClick={() => setCreating(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-fg text-sm font-medium text-bg active:scale-[0.98]"
        >
          <Plus className="size-4" /> Nueva lista
        </button>
        <button
          onClick={() => setJoining(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-medium active:scale-[0.98]"
        >
          <KeyRound className="size-4" /> Tengo un código
        </button>
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <span className="label">Listas</span>
        <span className="label tabular-nums">{lists?.length ?? '—'}</span>
      </div>

      <ul className="space-y-2.5">
        {isLoading && [0, 1].map((i) => <li key={i} className="h-44 animate-pulse rounded-2xl bg-surface" />)}
        {lists?.map((l, i) => <ListCard key={l.id} list={l} index={i} />)}
      </ul>

      {lists && lists.length === 1 && (
        <p className="mt-6 px-6 text-center text-sm leading-relaxed text-dim">
          Creá una lista y compartila con tu pareja o amigos para armar una en conjunto.
        </p>
      )}

      <CreateListSheet open={creating} onOpenChange={setCreating} />
      <JoinCodeSheet open={joining} onOpenChange={setJoining} />
    </div>
  )
}
