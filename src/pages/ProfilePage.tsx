import { useRef, useState, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Camera, LoaderCircle, LogOut } from 'lucide-react'
import { Avatar, AVATAR_COLORS } from '@/components/Avatar'
import { SoomaSignature } from '@/components/SoomaSignature'
import { StatusDot } from '@/components/StatusDot'
import { Btn } from '@/components/Button'
import { useToast } from '@/components/Toast'
import { RollingNumber } from '@/components/ui/rolling-number'
import { backend } from '@/data'
import { useMyLists } from '@/data/hooks'
import { useMe } from '@/lib/auth'
import { squareAvatar } from '@/lib/image'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, STATUSES } from '@/types'

export function ProfilePage() {
  const me = useMe()
  const { data: lists = [] } = useMyLists()
  const [name, setName] = useState(me.name)
  const toast = useToast()
  const qc = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const totals = STATUSES.map((s) => ({ s, n: lists.reduce((acc, l) => acc + l.counts[s], 0) }))
  const shared = lists.filter((l) => l.members.length > 1).length

  async function changePhoto(image: Blob | null) {
    setUploading(true)
    try {
      await backend.auth.setAvatar(image)
      // La foto aparece también en las listas y en los miembros
      qc.invalidateQueries({ queryKey: ['lists'] })
      qc.invalidateQueries({ queryKey: ['members'] })
      toast({ emoji: image ? '📸' : '🧹', title: image ? 'Foto actualizada' : 'Foto quitada' })
    } catch (err) {
      toast({ emoji: '⚠️', title: err instanceof Error ? err.message : 'No pudimos cambiar la foto.' })
    } finally {
      setUploading(false)
    }
  }

  async function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir la misma foto
    if (!file) return
    try {
      await changePhoto(await squareAvatar(file))
    } catch (err) {
      toast({ emoji: '⚠️', title: err instanceof Error ? err.message : 'No pudimos leer esa imagen.' })
    }
  }

  async function saveName() {
    if (!name.trim() || name.trim() === me.name) return
    await backend.auth.updateProfile({ name: name.trim() })
    toast({ emoji: '✏️', title: 'Nombre actualizado' })
  }

  return (
    <div className="px-4 pt-safe">
      <div className="flex flex-col items-center pt-10 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.45 }}>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label={me.avatarUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
            className="relative block rounded-full transition active:scale-95"
          >
            <Avatar profile={{ ...me, name: name || me.name }} size="lg" />
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-bg/70">
                <LoaderCircle className="size-6 animate-spin" />
              </span>
            )}
            <span className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-fg">
              <Camera className="size-3.5" />
            </span>
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </motion.div>
        {me.avatarUrl && (
          <button
            type="button"
            onClick={() => changePhoto(null)}
            disabled={uploading}
            className="label mt-3 text-faint transition hover:text-fg"
          >
            Quitar foto
          </button>
        )}
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
        <p>
          <Link to="/privacidad" className="underline">
            Política de privacidad
          </Link>
        </p>
        <div className="mx-auto !mt-6 mb-2 h-px w-8 bg-line" />
        <SoomaSignature />
      </footer>
    </div>
  )
}
