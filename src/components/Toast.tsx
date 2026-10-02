import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import {
  DynamicContainer,
  DynamicIsland,
  DynamicIslandProvider,
  useDynamicIslandSize,
} from '@/components/ui/dynamic-island'

interface ToastInput {
  title: string
  description?: string
  emoji?: string
}

const ToastContext = createContext<(t: ToastInput) => void>(() => {})

/** Notificaciones estilo Dynamic Island (Cult UI) arriba de la pantalla. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <DynamicIslandProvider initialSize="empty">
      <Island>{children}</Island>
    </DynamicIslandProvider>
  )
}

function Island({ children }: { children: ReactNode }) {
  const { state, dispatch } = useDynamicIslandSize()
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback(
    (t: ToastInput) => {
      setToast({ ...t, key: Date.now() })
      dispatch({ type: 'SET_SIZE', newSize: 'compactLong' })
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => dispatch({ type: 'SET_SIZE', newSize: 'empty' }), 2600)
    },
    [dispatch],
  )

  const visible = state.size !== 'empty'

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center pt-safe transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0, transitionDelay: visible ? '0ms' : '250ms' }}
      >
        <div className="mt-2">
          <DynamicIsland id="toast">
            {visible && toast && (
              <DynamicContainer key={toast.key} className="flex h-full items-center gap-3 px-3.5 text-left">
                {toast.emoji && (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-base">
                    {toast.emoji}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white">{toast.title}</p>
                  {toast.description && <p className="truncate font-mono text-[10.5px] tracking-wide text-white/50 uppercase">{toast.description}</p>}
                </div>
              </DynamicContainer>
            )}
          </DynamicIsland>
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
