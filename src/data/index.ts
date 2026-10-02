import type { Backend } from './backend'
import { localBackend } from './local'
import { supabaseBackend, supabaseConfigured } from './supabase'

// Con las variables de Supabase en .env usamos la base real; si no, el backend local.
export const backend: Backend = supabaseConfigured ? supabaseBackend : localBackend

export { BackendError } from './backend'
