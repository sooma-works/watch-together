import type { Item, List, ListSummary, Media, Member, Profile, Review, Status } from '@/types'

/**
 * Contrato de la capa de datos. Hoy lo implementa `local.ts` (localStorage,
 * simula varios usuarios en el mismo navegador); después lo implementa
 * Supabase con exactamente la misma forma, así las pantallas no cambian.
 */
export interface Backend {
  readonly kind: 'local' | 'supabase'

  auth: {
    getSession(): Promise<Profile | null>
    signIn(email: string, password: string): Promise<Profile>
    signUp(input: { name: string; email: string; password: string }): Promise<Profile>
    signInWithGoogle(): Promise<Profile | null>
    signOut(): Promise<void>
    updateProfile(patch: Partial<Pick<Profile, 'name' | 'color'>>): Promise<Profile>
    onChange(cb: (user: Profile | null) => void): () => void
  }

  lists: {
    mine(): Promise<ListSummary[]>
    get(listId: string): Promise<List>
    members(listId: string): Promise<Member[]>
    create(input: { name: string; emoji: string }): Promise<List>
    update(listId: string, patch: Partial<Pick<List, 'name' | 'emoji'>>): Promise<List>
    remove(listId: string): Promise<void>
    leave(listId: string): Promise<void>
    regenerateInvite(listId: string): Promise<string>
    /** Datos públicos para la pantalla de invitación. */
    previewInvite(code: string): Promise<{ list: List; members: Profile[] } | null>
    join(code: string): Promise<List>
  }

  items: {
    ofList(listId: string): Promise<Item[]>
    add(listId: string, media: Media, status: Status): Promise<Item>
    update(itemId: string, patch: Partial<Pick<Item, 'status' | 'progress' | 'finishedAt'>>): Promise<Item>
    remove(itemId: string): Promise<void>
    /** En qué listas mías ya está este título (para la búsqueda). */
    locate(mediaId: string): Promise<Pick<Item, 'id' | 'listId' | 'status'>[]>
  }

  reviews: {
    ofList(listId: string): Promise<Review[]>
    upsert(itemId: string, patch: { rating?: number | null; comment?: string | null }): Promise<Review>
  }
}

export class BackendError extends Error {}
