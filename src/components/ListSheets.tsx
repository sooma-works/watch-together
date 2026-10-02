import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, Copy, LogOut, RefreshCw, Share2, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { Btn } from '@/components/Button'
import { Poster } from '@/components/Poster'
import { Sheet, SheetHeader, useSheetView } from '@/components/Sheet'
import { StatusDot } from '@/components/StatusDot'
import { useToast } from '@/components/Toast'
import {
  useAddItem,
  useCreateList,
  useLeaveList,
  useLocate,
  useMyLists,
  useRegenerateInvite,
  useRemoveList,
  useUpdateList,
} from '@/data/hooks'
import { useMe } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { STATUS_EMOJI, STATUS_LABEL, STATUSES, type List, type Media, type Member } from '@/types'

const EMOJIS = ['🍿', '💕', '🎬', '📺', '🔥', '👻', '🍕', '🌙', '🎌', '🧠', '🎮', '🌈', '🛋️', '🍷', '🚀', '⭐']

const input =
  'w-full rounded-xl border border-line bg-bg px-4 py-3.5 text-[15px] outline-none placeholder:text-faint focus:border-line-strong'

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          data-vaul-no-drag=""
          onClick={() => onChange(e)}
          className={cn(
            'relative flex aspect-square items-center justify-center rounded-xl text-xl transition active:scale-90',
            value === e ? 'bg-surface-3 ring-1 ring-fg' : 'bg-bg ring-1 ring-line',
          )}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Crear lista

export function CreateListSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('💕')
  const create = useCreateList()
  const navigate = useNavigate()

  function submit() {
    create.mutate(
      { name, emoji },
      {
        onSuccess: (list) => {
          onOpenChange(false)
          setName('')
          navigate(`/l/${list.id}`, { state: { justCreated: true } })
        },
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader title="Nueva lista" description="Para vos, tu pareja, tus amigos… después la compartís con un link." />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-xl border border-line bg-bg text-2xl">{emoji}</span>
          <input data-vaul-no-drag="" className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Con Sofi, Los pibes, Anime…" maxLength={40} />
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <Btn type="submit" size="lg" className="w-full" disabled={create.isPending || !name.trim()}>
          Crear lista
        </Btn>
      </form>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Compartir

export function ShareSheet({
  list,
  members,
  open,
  onOpenChange,
}: {
  list: List
  members: Member[]
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const me = useMe()
  const [copied, setCopied] = useState(false)
  const regenerate = useRegenerateInvite(list.id)
  const toast = useToast()
  const link = `${location.origin}/unirse/${list.inviteCode}`
  const isOwner = list.ownerId === me.id

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast({ emoji: '⚠️', title: 'No se pudo copiar', description: link })
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${list.emoji} ${list.name}`, text: `Sumate a mi lista "${list.name}" en Watch 2gder`, url: link })
      } catch {
        // cancelado por el usuario
      }
    } else copy()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader title="Compartir lista" description="Cualquiera con el código puede sumarse, ver la lista y dejar su opinión." />

      <div className="dotgrid rounded-xl border border-line bg-bg p-5 text-center">
        <p className="label">Código de invitación</p>
        <div className="mt-2 flex justify-center gap-1.5">
          {list.inviteCode.split('').map((c, i) => (
            <motion.span
              key={`${list.inviteCode}-${i}`}
              initial={{ y: 12, opacity: 0, rotateX: 90 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', bounce: 0.4 }}
              className="flex h-12 w-10 items-center justify-center rounded-lg border border-line bg-surface font-mono text-2xl font-medium"
            >
              {c}
            </motion.span>
          ))}
        </div>
        <p className="mt-3 truncate font-mono text-[11px] text-faint">{link}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn variant="soft" size="lg" onClick={copy}>
          {copied ? <Check className="size-4 text-st-completed" /> : <Copy className="size-4" />}
          {copied ? 'Copiado' : 'Copiar link'}
        </Btn>
        <Btn variant="signal" size="lg" onClick={share}>
          <Share2 className="size-4" /> Compartir
        </Btn>
      </div>

      <h3 className="label mt-6 mb-2">
        Miembros · {members.length}
      </h3>
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.profile.id} className="flex items-center gap-3 border-b border-line py-2 last:border-0">
            <Avatar profile={m.profile} />
            <span className="flex-1 text-sm">
              {m.profile.name} {m.profile.id === me.id && <span className="text-dim">(vos)</span>}
            </span>
            {m.role === 'owner' && <span className="rounded border border-line px-1.5 py-px font-mono text-[10px] tracking-wider text-dim uppercase">Creador</span>}
          </li>
        ))}
      </ul>

      {isOwner && (
        <button
          data-vaul-no-drag=""
          onClick={() => regenerate.mutate(undefined, { onSuccess: () => toast({ emoji: '🔑', title: 'Código nuevo generado', description: 'El anterior ya no funciona' }) })}
          className="mx-auto mt-4 flex items-center gap-1.5 font-mono text-[10.5px] tracking-wider text-faint uppercase"
        >
          <RefreshCw className={cn('size-3.5', regenerate.isPending && 'animate-spin')} /> Generar código nuevo
        </button>
      )}
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Ajustes de lista (renombrar / borrar / salir)

export function ListSettingsSheet({ list, open, onOpenChange }: { list: List; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ListSettingsViews list={list} close={() => onOpenChange(false)} />
    </Sheet>
  )
}

function ListSettingsViews({ list, close }: { list: List; close: () => void }) {
  const me = useMe()
  const [view, setView] = useSheetView()
  const [name, setName] = useState(list.name)
  const [emoji, setEmoji] = useState(list.emoji)
  const update = useUpdateList(list.id)
  const remove = useRemoveList()
  const leave = useLeaveList()
  const navigate = useNavigate()
  const toast = useToast()
  const isOwner = list.ownerId === me.id

  if (view === 'danger') {
    const action = isOwner ? remove : leave
    return (
      <div>
        <SheetHeader
          title={isOwner ? '¿Borrar la lista?' : '¿Salir de la lista?'}
          description={
            isOwner
              ? 'Se borra para todos los miembros, con todos sus títulos y opiniones. No se puede deshacer.'
              : 'Vas a dejar de verla. Podés volver a entrar con el código.'
          }
          onBack={() => setView('default')}
        />
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="soft" size="lg" onClick={() => setView('default')}>
            Cancelar
          </Btn>
          <Btn
            variant="danger"
            size="lg"
            disabled={action.isPending}
            onClick={() =>
              action.mutate(list.id, {
                onSuccess: () => {
                  close()
                  navigate('/', { replace: true })
                  toast({ emoji: isOwner ? '🗑️' : '👋', title: isOwner ? 'Lista borrada' : 'Saliste de la lista', description: list.name })
                },
                onError: (e) => toast({ emoji: '⚠️', title: e.message }),
              })
            }
          >
            {isOwner ? 'Borrar' : 'Salir'}
          </Btn>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SheetHeader title="Ajustes de la lista" />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          update.mutate({ name: name.trim() || list.name, emoji }, { onSuccess: () => close() })
        }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-xl border border-line bg-bg text-2xl">{emoji}</span>
          <input data-vaul-no-drag="" className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <Btn type="submit" size="lg" className="w-full" disabled={update.isPending}>
          Guardar cambios
        </Btn>
      </form>
      {!list.isPersonal && (
        <button
          data-vaul-no-drag=""
          onClick={() => setView('danger')}
          className="mx-auto mt-5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-wider text-faint uppercase active:text-destructive"
        >
          {isOwner ? <Trash2 className="size-3.5" /> : <LogOut className="size-3.5" />}
          {isOwner ? 'Borrar lista' : 'Salir de la lista'}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Unirse con código

export function JoinCodeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [code, setCode] = useState('')
  const navigate = useNavigate()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader title="Unirme a una lista" description="Pedile el código de 6 letras a quien la creó." />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onOpenChange(false)
          navigate(`/unirse/${code}`)
        }}
      >
        <label className="relative block">
          <input
            data-vaul-no-drag=""
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            autoCapitalize="characters"
            autoComplete="off"
            className="absolute inset-0 opacity-0"
            aria-label="Código de invitación"
          />
          <div className="pointer-events-none flex justify-center gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'flex h-14 w-11 items-center justify-center rounded-lg border bg-bg font-mono text-2xl font-medium transition',
                  i === code.length ? 'border-signal' : 'border-line',
                )}
              >
                {code[i] ?? ''}
              </span>
            ))}
          </div>
        </label>
        <Btn type="submit" size="lg" className="mt-5 w-full" disabled={code.length !== 6}>
          Continuar
        </Btn>
      </form>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Agregar un título a una lista (desde Buscar)

export function AddToListSheet({
  media,
  open,
  onOpenChange,
  defaultListId,
}: {
  media: Media | null
  open: boolean
  onOpenChange: (o: boolean) => void
  defaultListId?: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {media && <AddToListBody key={media.id} media={media} defaultListId={defaultListId} close={() => onOpenChange(false)} />}
    </Sheet>
  )
}

function AddToListBody({ media, defaultListId, close }: { media: Media; defaultListId?: string; close: () => void }) {
  const { data: lists = [] } = useMyLists()
  const { data: located = [] } = useLocate(media.id)
  const [listId, setListId] = useState<string | undefined>(defaultListId)
  const add = useAddItem()
  const toast = useToast()
  const selected = lists.find((l) => l.id === (listId ?? lists[0]?.id))
  const existing = located.find((l) => l.listId === selected?.id)

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="w-14 shrink-0">
          <Poster media={media} compact />
        </div>
        <SheetHeader title={media.title} description="¿A qué lista y cómo la agregamos?" className="mb-0" />
      </div>

      {lists.length > 1 && (
        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
          {lists.map((l) => {
            const isSel = l.id === selected?.id
            const where = located.find((x) => x.listId === l.id)
            return (
              <button
                key={l.id}
                data-vaul-no-drag=""
                onClick={() => setListId(l.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                  isSel ? 'border-fg bg-surface-2' : 'border-line bg-bg',
                )}
              >
                <span className="text-lg">{l.emoji}</span>
                <span>
                  <span className="block font-medium">{l.name}</span>
                  <span className="block font-mono text-[10px] tracking-wide text-dim uppercase">
                    {where ? `Ya está · ${STATUS_LABEL[where.status]}` : `${l.members.length} ${l.members.length === 1 ? 'persona' : 'personas'}`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="grid gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            data-vaul-no-drag=""
            disabled={add.isPending || !selected}
            onClick={() =>
              add.mutate(
                { listId: selected!.id, media, status: s },
                {
                  onSuccess: () => {
                    toast({ emoji: STATUS_EMOJI[s], title: `${selected!.emoji} ${selected!.name}`, description: `${media.title} → ${STATUS_LABEL[s]}` })
                    close()
                  },
                },
              )
            }
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.98]',
              existing?.status === s ? 'border-fg bg-surface-2' : 'border-line bg-bg',
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface"><StatusDot status={s} className="size-2" /></span>
            <span className="flex-1">
              <span className="block font-medium">{STATUS_LABEL[s]}</span>
              <span className="block text-xs text-dim">
                {s === 'watching' ? 'La están viendo ahora' : s === 'planned' ? 'Para ver más adelante' : 'Ya la vieron'}
              </span>
            </span>
            {existing?.status === s && <Check className="size-4 text-fg" />}
          </button>
        ))}
      </div>
    </div>
  )
}
