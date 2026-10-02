import { createClient, type PostgrestError, type User } from '@supabase/supabase-js'
import type { Item, List, ListSummary, Media, Member, Profile, Review, Role, Status } from '@/types'
import { BackendError, type Backend } from './backend'

/**
 * Backend real sobre Supabase. Las reglas de acceso las aplica la base (RLS,
 * ver supabase/migrations); acá solo se traduce snake_case ↔ camelCase y se
 * convierten los errores en mensajes para mostrar.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = !!(url && key)

const sb = supabaseConfigured ? createClient(url!, key!) : (null as never)

/** Para avisar cambios de perfil (nombre, color), que Supabase Auth no emite. */
const profileListeners = new Set<(u: Profile | null) => void>()

// --- Filas de la base -----------------------------------------------------

interface ProfileRow {
  id: string
  name: string
  color: number
  avatar_url: string | null
}

const PROFILE_COLUMNS = 'id, name, color, avatar_url'
interface ListRow {
  id: string
  name: string
  emoji: string
  owner_id: string
  invite_code: string
  is_personal: boolean
  created_at: string
}
interface ItemRow {
  id: string
  list_id: string
  media_id: string
  media: Media
  status: Status
  progress: Item['progress'] | null
  added_by: string | null
  finished_at: string | null
  added_at: string
  updated_at: string
}
interface ReviewRow {
  item_id: string
  user_id: string
  rating: number | null
  comment: string | null
  updated_at: string
}

/** El email de otras personas no se comparte: solo conocemos el propio. */
const toProfile = (r: ProfileRow, email = ''): Profile => ({
  id: r.id,
  name: r.name,
  color: r.color,
  avatarUrl: r.avatar_url ?? undefined,
  email,
})

const toList = (r: ListRow): List => ({
  id: r.id,
  name: r.name,
  emoji: r.emoji,
  ownerId: r.owner_id,
  inviteCode: r.invite_code,
  isPersonal: r.is_personal,
  createdAt: r.created_at,
})

const toItem = (r: ItemRow): Item => ({
  id: r.id,
  listId: r.list_id,
  media: r.media,
  status: r.status,
  progress: r.progress ?? undefined,
  addedBy: r.added_by ?? '',
  finishedAt: r.finished_at ?? undefined,
  addedAt: r.added_at,
  updatedAt: r.updated_at,
})

const toReview = (r: ReviewRow): Review => ({
  itemId: r.item_id,
  userId: r.user_id,
  rating: r.rating ?? undefined,
  comment: r.comment ?? undefined,
  updatedAt: r.updated_at,
})

// --- Errores ----------------------------------------------------------------

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  user_already_exists: 'Ya existe una cuenta con ese email.',
  email_exists: 'Ya existe una cuenta con ese email.',
  weak_password: 'La contraseña necesita al menos 6 caracteres.',
  email_address_invalid: 'Ingresá un email válido.',
  validation_failed: 'Revisá el email y la contraseña.',
  email_not_confirmed: 'Confirmá tu email antes de ingresar (revisá tu casilla).',
  over_request_rate_limit: 'Demasiados intentos. Esperá un rato y probá de nuevo.',
  over_email_send_rate_limit: 'Demasiados mails enviados. Esperá un rato y probá de nuevo.',
}

function authError(e: { code?: string; message: string }): never {
  throw new BackendError((e.code && AUTH_MESSAGES[e.code]) || 'No pudimos iniciar sesión. Probá de nuevo.')
}

/** Los RPC tiran excepciones con mensajes ya escritos para mostrar (P0001). */
function dbError(e: PostgrestError, fallback = 'Algo salió mal. Probá de nuevo.'): never {
  throw new BackendError(e.code === 'P0001' ? e.message : fallback)
}

function must<T>(res: { data: T | null; error: PostgrestError | null }, fallback?: string): T {
  if (res.error) dbError(res.error, fallback)
  if (res.data === null) throw new BackendError(fallback ?? 'No encontramos lo que buscabas.')
  return res.data
}

// --- Sesión -------------------------------------------------------------------

async function profileOf(user: User): Promise<Profile> {
  const row = must(
    await sb.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).single<ProfileRow>(),
    'No encontramos tu perfil.',
  )
  return toProfile(row, user.email ?? '')
}

async function currentUser(): Promise<User> {
  const { data } = await sb.auth.getSession()
  if (!data.session) throw new BackendError('Tenés que iniciar sesión.')
  return data.session.user
}

const AVATARS = 'avatars'

async function saveProfile(user: User, patch: Partial<Omit<ProfileRow, 'id'>>): Promise<Profile> {
  const row = must(
    await sb.from('profiles').update(patch).eq('id', user.id).select(PROFILE_COLUMNS).single<ProfileRow>(),
    'No pudimos guardar tu perfil.',
  )
  const profile = toProfile(row, user.email ?? '')
  profileListeners.forEach((cb) => cb(profile))
  return profile
}

// --- Backend --------------------------------------------------------------------

export const supabaseBackend: Backend = {
  kind: 'supabase',

  auth: {
    async getSession() {
      const { data } = await sb.auth.getSession()
      return data.session ? profileOf(data.session.user).catch(() => null) : null
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
      if (error) authError(error)
      return profileOf(data.user)
    },

    async signUp({ name, email, password }) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
      })
      if (error) authError(error)
      // Con "Confirm email" activado no hay sesión hasta que confirme el mail
      if (!data.session || !data.user) {
        throw new BackendError('Te mandamos un mail para confirmar la cuenta. Abrilo y después ingresá.')
      }
      return profileOf(data.user)
    },

    async signInWithGoogle(returnTo = '/') {
      // Redirige a Google; al volver, onChange avisa la sesión nueva.
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + returnTo },
      })
      if (error) authError(error)
      return null
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async updateProfile(patch) {
      const user = await currentUser()
      return saveProfile(user, patch)
    },

    async setAvatar(image) {
      const user = await currentUser()
      const folder = user.id
      // Las fotos anteriores se borran: cada uno tiene una sola en Storage
      const { data: old } = await sb.storage.from(AVATARS).list(folder)
      const oldPaths = (old ?? []).map((f) => `${folder}/${f.name}`)

      let avatarUrl: string | null = null
      if (image) {
        // Nombre nuevo cada vez: evita que el navegador muestre la foto vieja cacheada
        const path = `${folder}/${Date.now()}.webp`
        const { error } = await sb.storage.from(AVATARS).upload(path, image, { contentType: 'image/webp' })
        if (error) throw new BackendError('No pudimos subir la foto. Probá con otra imagen.')
        avatarUrl = sb.storage.from(AVATARS).getPublicUrl(path).data.publicUrl
      }
      const profile = await saveProfile(user, { avatar_url: avatarUrl })
      if (oldPaths.length) await sb.storage.from(AVATARS).remove(oldPaths)
      return profile
    },

    onChange(cb) {
      profileListeners.add(cb)
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return
        // No llamar a Supabase dentro del callback (puede trabar el cliente)
        setTimeout(async () => {
          cb(session ? await profileOf(session.user).catch(() => null) : null)
        })
      })
      return () => {
        profileListeners.delete(cb)
        data.subscription.unsubscribe()
      }
    },
  },

  lists: {
    async mine() {
      const user = await currentUser()
      const memberships = must(
        await sb
          .from('list_members')
          .select('role, lists(*)')
          .eq('user_id', user.id)
          .returns<{ role: Role; lists: ListRow }[]>(),
      )
      const ids = memberships.map((m) => m.lists.id)
      if (!ids.length) return []

      const [items, members] = await Promise.all([
        sb
          .from('items')
          .select('list_id, status, media, updated_at')
          .in('list_id', ids)
          .order('updated_at', { ascending: false })
          .returns<Pick<ItemRow, 'list_id' | 'status' | 'media' | 'updated_at'>[]>()
          .then(must),
        sb
          .from('list_members')
          .select('list_id, joined_at, profiles(id, name, color, avatar_url)')
          .in('list_id', ids)
          .order('joined_at')
          .returns<{ list_id: string; profiles: ProfileRow }[]>()
          .then(must),
      ])

      return memberships
        .map(({ role, lists: row }): ListSummary => {
          const own = items.filter((i) => i.list_id === row.id)
          const counts: Record<Status, number> = { watching: 0, completed: 0, planned: 0 }
          own.forEach((i) => counts[i.status]++)
          return {
            ...toList(row),
            role,
            counts,
            posters: own.slice(0, 3).map((i) => i.media),
            members: members
              .filter((m) => m.list_id === row.id)
              .map((m) => (m.profiles.id === user.id ? toProfile(m.profiles, user.email ?? '') : toProfile(m.profiles))),
          }
        })
        .sort((a, b) => Number(b.isPersonal) - Number(a.isPersonal) || a.createdAt.localeCompare(b.createdAt))
    },

    async get(listId) {
      const res = await sb.from('lists').select('*').eq('id', listId).maybeSingle<ListRow>()
      return toList(must(res, 'No tenés acceso a esta lista.'))
    },

    async members(listId) {
      const user = await currentUser()
      const rows = must(
        await sb
          .from('list_members')
          .select('role, joined_at, profiles(id, name, color, avatar_url)')
          .eq('list_id', listId)
          .order('joined_at')
          .returns<{ role: Role; joined_at: string; profiles: ProfileRow }[]>(),
      )
      return rows.map(
        (m): Member => ({
          listId,
          role: m.role,
          joinedAt: m.joined_at,
          profile: toProfile(m.profiles, m.profiles.id === user.id ? (user.email ?? '') : ''),
        }),
      )
    },

    async create({ name, emoji }) {
      const user = await currentUser()
      const row = must(
        await sb
          .from('lists')
          .insert({ name: name.trim() || 'Nueva lista', emoji, owner_id: user.id })
          .select('*')
          .single<ListRow>(),
        'No pudimos crear la lista.',
      )
      return toList(row)
    },

    async update(listId, patch) {
      const row = must(
        await sb.from('lists').update(patch).eq('id', listId).select('*').maybeSingle<ListRow>(),
        'No pudimos guardar los cambios.',
      )
      return toList(row)
    },

    async remove(listId) {
      const list = await supabaseBackend.lists.get(listId)
      const user = await currentUser()
      if (list.ownerId !== user.id) throw new BackendError('Solo quien creó la lista puede borrarla.')
      if (list.isPersonal) throw new BackendError('Tu lista personal no se puede borrar.')
      const { error } = await sb.from('lists').delete().eq('id', listId)
      if (error) dbError(error, 'No pudimos borrar la lista.')
    },

    async leave(listId) {
      const user = await currentUser()
      const list = await supabaseBackend.lists.get(listId)
      if (list.ownerId === user.id) throw new BackendError('Sos dueño de esta lista: borrala en vez de salir.')
      const { error } = await sb.from('list_members').delete().eq('list_id', listId).eq('user_id', user.id)
      if (error) dbError(error, 'No pudimos sacarte de la lista.')
    },

    async regenerateInvite(listId) {
      return must(await sb.rpc('regenerate_invite', { _list_id: listId }))
    },

    async previewInvite(code) {
      const { data, error } = await sb.rpc('preview_invite', { _code: code })
      if (error) dbError(error, 'No pudimos leer la invitación.')
      if (!data) return null
      const preview = data as { list: Omit<ListRow, 'invite_code'>; members: ProfileRow[] }
      return {
        list: toList({ ...preview.list, invite_code: code.trim().toUpperCase() }),
        members: preview.members.map((m) => toProfile(m)),
      }
    },

    async join(code) {
      return toList(must(await sb.rpc('join_list', { _code: code }).single<ListRow>()))
    },
  },

  items: {
    async ofList(listId) {
      const rows = must(await sb.from('items').select('*').eq('list_id', listId).returns<ItemRow[]>())
      return rows.map(toItem)
    },

    async add(listId, media, status) {
      const user = await currentUser()
      // Si el título ya estaba en la lista, solo cambia el estado (como en local)
      const existing = await sb
        .from('items')
        .select('id')
        .eq('list_id', listId)
        .eq('media_id', media.id)
        .maybeSingle<{ id: string }>()
      if (existing.error) dbError(existing.error)
      if (existing.data) return supabaseBackend.items.update(existing.data.id, { status })

      const row = must(
        await sb
          .from('items')
          .insert({ list_id: listId, media_id: media.id, media, status, added_by: user.id })
          .select('*')
          .single<ItemRow>(),
        'No pudimos agregar el título.',
      )
      return toItem(row)
    },

    async update(itemId, patch) {
      const row = must(
        await sb
          .from('items')
          .update({
            ...(patch.status !== undefined && { status: patch.status }),
            ...(patch.progress !== undefined && { progress: patch.progress ?? null }),
            ...(patch.finishedAt !== undefined && { finished_at: patch.finishedAt ?? null }),
          })
          .eq('id', itemId)
          .select('*')
          .maybeSingle<ItemRow>(),
        'El título ya no existe.',
      )
      return toItem(row)
    },

    async remove(itemId) {
      const { error } = await sb.from('items').delete().eq('id', itemId)
      if (error) dbError(error, 'No pudimos sacar el título.')
    },

    async locate(mediaId) {
      // RLS ya limita a las listas de las que soy miembro
      const rows = must(
        await sb.from('items').select('id, list_id, status').eq('media_id', mediaId).returns<Pick<ItemRow, 'id' | 'list_id' | 'status'>[]>(),
      )
      return rows.map((r) => ({ id: r.id, listId: r.list_id, status: r.status }))
    },
  },

  reviews: {
    async ofList(listId) {
      const rows = must(
        await sb
          .from('reviews')
          .select('item_id, user_id, rating, comment, updated_at, items!inner(list_id)')
          .eq('items.list_id', listId)
          .returns<ReviewRow[]>(),
      )
      return rows.map(toReview)
    },

    async upsert(itemId, patch) {
      const user = await currentUser()
      const row = must(
        await sb
          .from('reviews')
          .upsert(
            {
              item_id: itemId,
              user_id: user.id,
              ...(patch.rating !== undefined && { rating: patch.rating }),
              ...(patch.comment !== undefined && { comment: patch.comment?.trim() || null }),
            },
            { onConflict: 'item_id,user_id' },
          )
          .select('item_id, user_id, rating, comment, updated_at')
          .single<ReviewRow>(),
        'No pudimos guardar tu opinión.',
      )
      return toReview(row)
    },
  },

  subscribe(onChange) {
    // RLS filtra los eventos: solo llegan los de listas de las que soy miembro
    const channel = sb
      .channel('wt-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_members' }, onChange)
      .subscribe()
    return () => {
      sb.removeChannel(channel)
    }
  },
}
