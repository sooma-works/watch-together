import type { Item, List, ListSummary, Member, Profile, Review, Role, Status } from '@/types'
import { BackendError, type Backend } from './backend'

/**
 * Backend local para desarrollo: guarda todo en localStorage y simula varios
 * usuarios en el mismo navegador (podés crear dos cuentas y compartir una
 * lista entre ellas con el código de invitación). Replica las reglas de
 * acceso que después va a aplicar Supabase con RLS.
 */

interface UserRow extends Profile {
  password: string
}
interface MemberRow {
  listId: string
  userId: string
  role: Role
  joinedAt: string
}
interface DB {
  users: UserRow[]
  lists: List[]
  members: MemberRow[]
  items: Item[]
  reviews: Review[]
}

const DB_KEY = 'wt:db:v2'
const SESSION_KEY = 'wt:session:v2'
const LATENCY = 120

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    // datos corruptos o storage bloqueado: arrancamos de cero
  }
  return { users: [], lists: [], members: [], items: [], reviews: [] }
}

function save(db: DB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // ignorar
  }
}

function sessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function setSession(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignorar
  }
}

const wait = () => new Promise((r) => setTimeout(r, LATENCY))
const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

function inviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => alphabet[b % alphabet.length]).join('')
}

function publicProfile({ password: _password, ...p }: UserRow): Profile {
  return p
}

const listeners = new Set<(u: Profile | null) => void>()
function emit(u: Profile | null) {
  listeners.forEach((cb) => cb(u))
}

/** Transacción: carga, aplica y guarda. */
async function tx<T>(fn: (db: DB, me: string | null) => T): Promise<T> {
  await wait()
  const db = load()
  const result = fn(db, sessionId())
  save(db)
  return result
}

function requireUser(me: string | null): string {
  if (!me) throw new BackendError('Tenés que iniciar sesión.')
  return me
}

function requireMember(db: DB, listId: string, me: string | null): MemberRow {
  const userId = requireUser(me)
  const m = db.members.find((m) => m.listId === listId && m.userId === userId)
  if (!m) throw new BackendError('No tenés acceso a esta lista.')
  return m
}

function itemOrThrow(db: DB, itemId: string): Item {
  const item = db.items.find((i) => i.id === itemId)
  if (!item) throw new BackendError('El título ya no existe.')
  return item
}

function createListRow(db: DB, ownerId: string, name: string, emoji: string, isPersonal: boolean): List {
  const list: List = { id: uid(), name, emoji, ownerId, inviteCode: inviteCode(), isPersonal, createdAt: now() }
  db.lists.push(list)
  db.members.push({ listId: list.id, userId: ownerId, role: 'owner', joinedAt: list.createdAt })
  return list
}

function createUser(db: DB, name: string, email: string, password: string): UserRow {
  const user: UserRow = { id: uid(), name, email, password, color: Math.floor(Math.random() * 8) }
  db.users.push(user)
  // Igual que el trigger de Supabase: cada cuenta nace con su lista personal
  createListRow(db, user.id, 'Mi lista', '🍿', true)
  return user
}

export const localBackend: Backend = {
  kind: 'local',

  auth: {
    async getSession() {
      const db = load()
      const u = db.users.find((u) => u.id === sessionId())
      return u ? publicProfile(u) : null
    },

    async signIn(email, password) {
      const user = await tx((db) => {
        const u = db.users.find((u) => u.email === email.trim().toLowerCase())
        if (!u || u.password !== password) throw new BackendError('Email o contraseña incorrectos.')
        return publicProfile(u)
      })
      setSession(user.id)
      emit(user)
      return user
    },

    async signUp({ name, email, password }) {
      const normalized = email.trim().toLowerCase()
      if (!normalized.includes('@')) throw new BackendError('Ingresá un email válido.')
      if (password.length < 6) throw new BackendError('La contraseña necesita al menos 6 caracteres.')
      const user = await tx((db) => {
        if (db.users.some((u) => u.email === normalized)) throw new BackendError('Ya existe una cuenta con ese email.')
        return publicProfile(createUser(db, name.trim() || normalized.split('@')[0], normalized, password))
      })
      setSession(user.id)
      emit(user)
      return user
    },

    async signInWithGoogle() {
      // Simulación: en local, "Google" entra con una cuenta demo fija.
      const user = await tx((db) => {
        const email = 'demo.google@watchtogether.local'
        const u = db.users.find((u) => u.email === email) ?? createUser(db, 'Demo Google', email, crypto.randomUUID())
        return publicProfile(u)
      })
      setSession(user.id)
      emit(user)
      return user
    },

    async signOut() {
      setSession(null)
      emit(null)
    },

    async updateProfile(patch) {
      const user = await tx((db, me) => {
        const u = db.users.find((u) => u.id === requireUser(me))!
        Object.assign(u, patch)
        return publicProfile(u)
      })
      emit(user)
      return user
    },

    async setAvatar(image) {
      // En local la foto se guarda como data URL dentro de localStorage
      const avatarUrl = image
        ? await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new BackendError('No pudimos leer la foto.'))
            reader.readAsDataURL(image)
          })
        : undefined
      const user = await tx((db, me) => {
        const u = db.users.find((u) => u.id === requireUser(me))!
        u.avatarUrl = avatarUrl
        return publicProfile(u)
      })
      emit(user)
      return user
    },

    onChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  },

  lists: {
    mine: () =>
      tx((db, me) => {
        const userId = requireUser(me)
        return db.members
          .filter((m) => m.userId === userId)
          .map((m): ListSummary => {
            const list = db.lists.find((l) => l.id === m.listId)!
            const items = db.items
              .filter((i) => i.listId === list.id)
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            const counts: Record<Status, number> = { watching: 0, completed: 0, planned: 0 }
            items.forEach((i) => counts[i.status]++)
            return {
              ...list,
              role: m.role,
              counts,
              posters: items.slice(0, 3).map((i) => i.media),
              members: db.members
                .filter((x) => x.listId === list.id)
                .map((x) => publicProfile(db.users.find((u) => u.id === x.userId)!)),
            }
          })
          .sort((a, b) => Number(b.isPersonal) - Number(a.isPersonal) || a.createdAt.localeCompare(b.createdAt))
      }),

    get: (listId) =>
      tx((db, me) => {
        requireMember(db, listId, me)
        return db.lists.find((l) => l.id === listId)!
      }),

    members: (listId) =>
      tx((db, me) => {
        requireMember(db, listId, me)
        return db.members
          .filter((m) => m.listId === listId)
          .map(
            (m): Member => ({
              listId,
              role: m.role,
              joinedAt: m.joinedAt,
              profile: publicProfile(db.users.find((u) => u.id === m.userId)!),
            }),
          )
      }),

    create: ({ name, emoji }) => tx((db, me) => createListRow(db, requireUser(me), name.trim() || 'Nueva lista', emoji, false)),

    update: (listId, patch) =>
      tx((db, me) => {
        requireMember(db, listId, me)
        const list = db.lists.find((l) => l.id === listId)!
        Object.assign(list, patch)
        return list
      }),

    remove: (listId) =>
      tx((db, me) => {
        const m = requireMember(db, listId, me)
        const list = db.lists.find((l) => l.id === listId)!
        if (m.role !== 'owner') throw new BackendError('Solo quien creó la lista puede borrarla.')
        if (list.isPersonal) throw new BackendError('Tu lista personal no se puede borrar.')
        const itemIds = new Set(db.items.filter((i) => i.listId === listId).map((i) => i.id))
        db.reviews = db.reviews.filter((r) => !itemIds.has(r.itemId))
        db.items = db.items.filter((i) => i.listId !== listId)
        db.members = db.members.filter((x) => x.listId !== listId)
        db.lists = db.lists.filter((l) => l.id !== listId)
      }),

    leave: (listId) =>
      tx((db, me) => {
        const m = requireMember(db, listId, me)
        if (m.role === 'owner') throw new BackendError('Sos dueño de esta lista: borrala en vez de salir.')
        db.members = db.members.filter((x) => x !== m)
      }),

    regenerateInvite: (listId) =>
      tx((db, me) => {
        const m = requireMember(db, listId, me)
        if (m.role !== 'owner') throw new BackendError('Solo quien creó la lista puede cambiar el código.')
        const list = db.lists.find((l) => l.id === listId)!
        list.inviteCode = inviteCode()
        return list.inviteCode
      }),

    previewInvite: (code) =>
      tx((db) => {
        const list = db.lists.find((l) => l.inviteCode === code.trim().toUpperCase())
        if (!list) return null
        const members = db.members
          .filter((m) => m.listId === list.id)
          .map((m) => publicProfile(db.users.find((u) => u.id === m.userId)!))
        return { list, members }
      }),

    join: (code) =>
      tx((db, me) => {
        const userId = requireUser(me)
        const list = db.lists.find((l) => l.inviteCode === code.trim().toUpperCase())
        if (!list) throw new BackendError('Ese código no existe o ya no es válido.')
        if (!db.members.some((m) => m.listId === list.id && m.userId === userId)) {
          db.members.push({ listId: list.id, userId, role: 'member', joinedAt: now() })
        }
        return list
      }),
  },

  items: {
    ofList: (listId) =>
      tx((db, me) => {
        requireMember(db, listId, me)
        return db.items.filter((i) => i.listId === listId)
      }),

    add: (listId, media, status) =>
      tx((db, me) => {
        const userId = requireMember(db, listId, me).userId
        const existing = db.items.find((i) => i.listId === listId && i.media.id === media.id)
        if (existing) {
          existing.status = status
          existing.updatedAt = now()
          return existing
        }
        const t = now()
        const item: Item = {
          id: uid(),
          listId,
          media,
          status,
          addedBy: userId,
          finishedAt: status === 'completed' ? t.slice(0, 10) : undefined,
          addedAt: t,
          updatedAt: t,
        }
        db.items.push(item)
        return item
      }),

    update: (itemId, patch) =>
      tx((db, me) => {
        const item = itemOrThrow(db, itemId)
        requireMember(db, item.listId, me)
        Object.assign(item, patch, { updatedAt: now() })
        if (patch.status === 'completed' && !item.finishedAt) item.finishedAt = item.updatedAt.slice(0, 10)
        return item
      }),

    remove: (itemId) =>
      tx((db, me) => {
        const item = itemOrThrow(db, itemId)
        requireMember(db, item.listId, me)
        db.items = db.items.filter((i) => i.id !== itemId)
        db.reviews = db.reviews.filter((r) => r.itemId !== itemId)
      }),

    locate: (mediaId) =>
      tx((db, me) => {
        const userId = requireUser(me)
        const mine = new Set(db.members.filter((m) => m.userId === userId).map((m) => m.listId))
        return db.items
          .filter((i) => i.media.id === mediaId && mine.has(i.listId))
          .map(({ id, listId, status }) => ({ id, listId, status }))
      }),
  },

  reviews: {
    ofList: (listId) =>
      tx((db, me) => {
        requireMember(db, listId, me)
        const ids = new Set(db.items.filter((i) => i.listId === listId).map((i) => i.id))
        return db.reviews.filter((r) => ids.has(r.itemId))
      }),

    upsert: (itemId, patch) =>
      tx((db, me) => {
        const item = itemOrThrow(db, itemId)
        const userId = requireMember(db, item.listId, me).userId
        let review = db.reviews.find((r) => r.itemId === itemId && r.userId === userId)
        if (!review) {
          review = { itemId, userId, updatedAt: now() }
          db.reviews.push(review)
        }
        if (patch.rating !== undefined) review.rating = patch.rating ?? undefined
        if (patch.comment !== undefined) review.comment = patch.comment?.trim() || undefined
        review.updatedAt = now()
        return review
      }),
  },
}
