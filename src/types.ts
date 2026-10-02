export type MediaType = 'movie' | 'series' | 'anime' | 'documentary'

export type Status = 'watching' | 'completed' | 'planned'

/** Un título tal como viene de la API de búsqueda (normalizado). */
export interface Media {
  /** Id estable: `<fuente>:<tipo>:<id>`, ej. `tmdb:tv:1396`. */
  id: string
  title: string
  originalTitle?: string
  year?: number
  type: MediaType
  posterUrl?: string
  backdropUrl?: string
  overview?: string
}

export interface Profile {
  id: string
  name: string
  email: string
  /** Índice de color para el avatar. */
  color: number
}

export type Role = 'owner' | 'member'

export interface List {
  id: string
  name: string
  emoji: string
  ownerId: string
  inviteCode: string
  /** La lista personal que se crea con la cuenta. */
  isPersonal: boolean
  createdAt: string
}

export interface Member {
  listId: string
  role: Role
  joinedAt: string
  profile: Profile
}

/** Un título dentro de una lista. Estado y progreso son compartidos. */
export interface Item {
  id: string
  listId: string
  media: Media
  status: Status
  progress?: { season?: number; episode?: number }
  addedBy: string
  finishedAt?: string
  addedAt: string
  updatedAt: string
}

/** Puntaje + comentario de UNA persona sobre un título de la lista. */
export interface Review {
  itemId: string
  userId: string
  /** 0.5 a 5, en pasos de 0.5. */
  rating?: number
  comment?: string
  updatedAt: string
}

/** Resumen de una lista para la pantalla de inicio. */
export interface ListSummary extends List {
  role: Role
  members: Profile[]
  counts: Record<Status, number>
  posters: Media[]
}

export const STATUSES: Status[] = ['watching', 'planned', 'completed']

export const STATUS_LABEL: Record<Status, string> = {
  watching: 'Viendo',
  completed: 'Vistos',
  planned: 'Quiero ver',
}

export const STATUS_EMOJI: Record<Status, string> = {
  watching: '🍿',
  completed: '✅',
  planned: '🔖',
}

export const TYPE_LABEL: Record<MediaType, string> = {
  movie: 'Película',
  series: 'Serie',
  anime: 'Anime',
  documentary: 'Documental',
}
