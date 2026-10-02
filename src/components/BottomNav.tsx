import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { LayoutGrid, Search, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { to: '/', label: 'Listas', icon: LayoutGrid, match: (p: string) => p === '/' || p.startsWith('/l/') },
  { to: '/buscar', label: 'Buscar', icon: Search, match: (p: string) => p.startsWith('/buscar') },
  { to: '/perfil', label: 'Perfil', icon: UserRound, match: (p: string) => p.startsWith('/perfil') },
]

/** Barra inferior flotante: el ítem activo se expande y muestra su nombre. */
export function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe">
      <div className="bar pointer-events-auto mb-4 flex items-center gap-0.5 rounded-2xl p-1">
        {ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={cn(
                'relative flex h-11 items-center gap-2 rounded-xl px-4 transition-colors',
                active ? 'text-bg' : 'text-dim active:scale-95',
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-fg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                />
              )}
              <Icon className="relative size-[18px]" strokeWidth={2} />
              <motion.span
                initial={false}
                animate={{ width: active ? 'auto' : 0, opacity: active ? 1 : 0 }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                className="relative overflow-hidden font-mono text-[11px] font-medium tracking-wider whitespace-nowrap uppercase"
              >
                {label}
              </motion.span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
