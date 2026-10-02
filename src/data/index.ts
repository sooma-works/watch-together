import type { Backend } from './backend'
import { localBackend } from './local'

// Cuando conectemos Supabase: `import.meta.env.VITE_SUPABASE_URL ? supabaseBackend : localBackend`
export const backend: Backend = localBackend

export { BackendError } from './backend'
