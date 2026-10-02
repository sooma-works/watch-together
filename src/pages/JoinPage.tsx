import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { AvatarStack } from '@/components/Avatar'
import { Btn } from '@/components/Button'
import { useToast } from '@/components/Toast'
import { useInvitePreview, useJoinList } from '@/data/hooks'
import { useAuth } from '@/lib/auth'

/** Pantalla a la que lleva el link de invitación: /unirse/CODIGO */
export function JoinPage() {
  const { code = '' } = useParams()
  const { user, loading } = useAuth()
  const preview = useInvitePreview(code)
  const join = useJoinList()
  const navigate = useNavigate()
  const toast = useToast()

  if (!loading && !user) return <Navigate to="/login" replace state={{ from: `/unirse/${code}` }} />

  const data = preview.data
  const alreadyIn = !!data && !!user && data.members.some((m) => m.id === user.id)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      {preview.isLoading ? (
        <div className="size-8 animate-spin rounded-full border-2 border-line border-t-signal" />
      ) : !data ? (
        <>
          <p className="text-5xl">🤔</p>
          <h1 className="heading mt-4 text-3xl">Código inválido</h1>
          <p className="mt-3 text-sm text-dim">
            El código <b className="font-mono">{code}</b> no existe o lo cambiaron. Pedile uno nuevo a quien te invitó.
          </p>
          <Link to="/" className="mt-8 font-mono text-xs tracking-wider text-signal uppercase">
            Ir a mis listas
          </Link>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.3 }} className="w-full">
          <p className="label">Invitación · {code}</p>
          <div className="dotgrid relative mt-4 overflow-hidden rounded-2xl border border-line bg-surface p-8">
            <motion.span
              className="relative block text-7xl"
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.2, delay: 0.3 }}
            >
              {data.list.emoji}
            </motion.span>
            <h1 className="heading relative mt-4 text-[2.4rem]">{data.list.name}</h1>
            <div className="relative mt-4 flex items-center justify-center gap-2">
              <AvatarStack profiles={data.members} size="sm" />
              <span className="text-sm text-dim">
                {data.members.map((m) => m.name.split(' ')[0]).join(', ')}
              </span>
            </div>
          </div>

          <Btn
            size="lg"
            className="mt-6 w-full"
            disabled={join.isPending}
            onClick={() =>
              alreadyIn
                ? navigate(`/l/${data.list.id}`)
                : join.mutate(code, {
                    onSuccess: (list) => {
                      toast({ emoji: '🎉', title: '¡Ya estás adentro!', description: list.name })
                      navigate(`/l/${list.id}`, { replace: true })
                    },
                    onError: (e) => toast({ emoji: '⚠️', title: e.message }),
                  })
            }
          >
            {alreadyIn ? 'Ya estás en esta lista · Abrir' : join.isPending ? 'Uniéndote…' : 'Unirme a la lista'}
          </Btn>
          <Link to="/" className="mt-4 inline-block font-mono text-[11px] tracking-wider text-faint uppercase">
            Ahora no
          </Link>
        </motion.div>
      )}
    </div>
  )
}
