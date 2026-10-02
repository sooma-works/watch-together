import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import { Btn } from '@/components/Button'
import { Poster } from '@/components/Poster'
import { backend } from '@/data'
import { demoSuggestions } from '@/lib/catalog'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

type Mode = 'signin' | 'signup'

const field =
  'h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition placeholder:text-faint focus:border-line-strong focus:bg-surface-2'

/** Tres filas de pósters que se deslizan en direcciones opuestas. */
function PosterMarquee() {
  const rows = [0, 1, 2].map((r) => {
    const shifted = [...demoSuggestions.slice(r * 5), ...demoSuggestions.slice(0, r * 5)]
    return [...shifted, ...shifted]
  })
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[52dvh] overflow-hidden">
      <div className="flex -rotate-[8deg] flex-col gap-3 pt-6" style={{ marginLeft: '-20%', width: '140%' }}>
        {rows.map((row, r) => (
          <motion.div
            key={r}
            className="flex w-max gap-3"
            animate={{ x: r % 2 ? ['-50%', '0%'] : ['0%', '-50%'] }}
            transition={{ duration: 60 + r * 12, ease: 'linear', repeat: Infinity }}
          >
            {row.map((m, i) => (
              <div key={i} className="w-24 shrink-0">
                <Poster media={m} />
              </div>
            ))}
          </motion.div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-bg/70 to-bg" />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  )
}

export function LoginPage() {
  const { user } = useAuth()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [mode, setMode] = useState<Mode>('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'form' | 'google' | null>(null)

  if (user) return <Navigate to={from} replace />

  async function run(kind: 'form' | 'google', fn: () => Promise<unknown>) {
    setError(null)
    setLoading(kind)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal. Probá de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    run('form', () => (mode === 'signin' ? backend.auth.signIn(form.email, form.password) : backend.auth.signUp(form)))
  }

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden px-6 pb-8">
      <PosterMarquee />

      <div className="relative mt-[30dvh] flex flex-1 flex-col">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="size-7" />
            <span className="label">Listas compartidas · v0.2</span>
          </div>
          <h1 className="heading mt-5 text-[3rem]">
            Watch
            <br />
            Together<span className="text-signal">.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-dim">
            Listas compartidas de pelis, series y anime. Lo que están viendo, lo que vieron y lo que les falta.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mt-8">
          <Btn variant="soft" size="lg" className="w-full" disabled={!!loading} onClick={() => run('google', () => backend.auth.signInWithGoogle(from))}>
            <GoogleIcon /> {loading === 'google' ? 'Conectando…' : 'Continuar con Google'}
          </Btn>

          <div className="label my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" /> o con email <span className="h-px flex-1 bg-line" />
          </div>

          {/* Selector ingresar / crear cuenta */}
          <div className="mb-4 grid grid-cols-2 rounded-xl border border-line bg-surface p-1">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={cn(
                  'relative h-9 rounded-lg font-mono text-[11px] tracking-wider uppercase transition-colors',
                  mode === m ? 'text-fg' : 'text-faint',
                )}
              >
                {mode === m && <motion.span layoutId="auth-mode" className="absolute inset-0 rounded-lg bg-surface-3" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
                <span className="relative">{m === 'signin' ? 'Ingresar' : 'Crear cuenta'}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <input className={field} value={form.name} onChange={update('name')} placeholder="Tu nombre" autoComplete="given-name" aria-label="Tu nombre" />
                </motion.div>
              )}
            </AnimatePresence>
            <input className={field} type="email" required value={form.email} onChange={update('email')} placeholder="Email" autoComplete="email" aria-label="Email" />
            <div className="relative">
              <input
                className={cn(field, 'pr-12')}
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={update('password')}
                placeholder="Contraseña"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                aria-label="Contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-faint"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-destructive/30 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Btn type="submit" size="lg" className="w-full" disabled={!!loading}>
              {loading === 'form' ? 'Un segundo…' : mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
            </Btn>
          </form>
        </motion.div>

        <div className="mt-auto space-y-3 pt-8 text-center">
          {backend.kind === 'local' && (
            <p className="label leading-relaxed normal-case tracking-normal text-faint">
              Modo local: las cuentas viven en este navegador. "Google" entra con una cuenta demo.
            </p>
          )}
          <Link to="/privacidad" className="label inline-block text-faint hover:text-fg">
            Privacidad
          </Link>
        </div>
      </div>
    </div>
  )
}
