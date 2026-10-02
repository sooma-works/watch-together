import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { backend } from '@/data'
import type { Profile } from '@/types'

interface AuthContextValue {
  user: Profile | null
  /** true mientras se recupera la sesión al abrir la app. */
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [state, setState] = useState<AuthContextValue>({ user: null, loading: true })

  useEffect(() => {
    backend.auth.getSession().then((user) => setState({ user, loading: false }))
    return backend.auth.onChange((user) => {
      setState((prev) => {
        // Al cambiar de cuenta no queremos ver datos cacheados de la anterior
        if (prev.user?.id !== user?.id) qc.clear()
        return { user, loading: false }
      })
    })
  }, [qc])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

/** Para pantallas dentro de rutas protegidas: el usuario siempre existe. */
export function useMe(): Profile {
  const { user } = useContext(AuthContext)
  if (!user) throw new Error('useMe se usó fuera de una ruta protegida')
  return user
}
