import { useState } from 'react'
import { motion } from 'motion/react'
import { LogOut } from 'lucide-react'
import { Avatar, AVATAR_COLORS } from '@/components/Avatar'
import { StatusDot } from '@/components/StatusDot'
import { Btn } from '@/components/Button'
import { useToast } from '@/components/Toast'
import { RollingNumber } from '@/components/ui/rolling-number'
import { backend } from '@/data'
import { useMyLists } from '@/data/hooks'
import { useMe } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, STATUSES } from '@/types'

export function ProfilePage() {
  const me = useMe()
  const { data: lists = [] } = useMyLists()
  const [name, setName] = useState(me.name)
  const toast = useToast()

  const totals = STATUSES.map((s) => ({ s, n: lists.reduce((acc, l) => acc + l.counts[s], 0) }))
  const shared = lists.filter((l) => l.members.length > 1).length

  async function saveName() {
    if (!name.trim() || name.trim() === me.name) return
    await backend.auth.updateProfile({ name: name.trim() })
    toast({ emoji: '✏️', title: 'Nombre actualizado' })
  }

  return (
    <div className="px-4 pt-safe">
      <div className="flex flex-col items-center pt-10 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.45 }}>
          <Avatar profile={{ ...me, name: name || me.name }} size="lg" />
        </motion.div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Tu nombre"
          className="heading mt-5 w-full bg-transparent text-center text-4xl outline-none"
        />
        <p className="mt-2 font-mono text-xs text-dim">{me.email}</p>

        <div className="mt-5 flex gap-2">
          {AVATAR_COLORS.map((c, i) => (
            <button
              key={c}
              aria-label={`Color ${i + 1}`}
              onClick={() => backend.auth.updateProfile({ color: i })}
              style={{ backgroundColor: c }}
              className={cn('size-6 rounded-full transition active:scale-90', me.color === i && 'ring-2 ring-fg ring-offset-2 ring-offset-bg')}
            />
          ))}
        </div>
      </div>

      <div className="label mt-10 mb-2">Total en tus listas</div>
      <div className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface">
        {totals.map(({ s, n }) => (
          <div key={s} className="p-3">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <StatusDot status={s} />
              <span className="label tracking-[0.04em]">{STATUS_LABEL[s]}</span>
            </div>
            <div className="mt-3 font-mono text-3xl leading-none font-medium tabular-nums">
              <RollingNumber value={n} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-dim">
        {lists.length} {lists.length === 1 ? 'lista' : 'listas'} · {shared} {shared === 1 ? 'compartida' : 'compartidas'}
      </p>

      <Btn variant="danger" size="lg" className="mt-8 w-full" onClick={() => backend.auth.signOut()}>
        <LogOut className="size-4" /> Cerrar sesión
      </Btn>

      <footer className="mt-10 space-y-1 text-center font-mono text-[10px] leading-relaxed text-faint">
        <p>Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.</p>
        <p>
          Componentes de interfaz de{' '}
          <a href="https://www.cult-ui.com" target="_blank" rel="noreferrer" className="underline">
            Cult UI
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
