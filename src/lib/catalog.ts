import type { Media, MediaType } from '@/types'

/**
 * Búsqueda de títulos. Usa TMDB (películas, series, anime y documentales en
 * una sola API) si hay token configurado; si no, cae a un catálogo de ejemplo
 * para que la app funcione igual en modo demo.
 */
const TOKEN = import.meta.env.VITE_TMDB_TOKEN as string | undefined
const LANGUAGE = 'es-MX'
const IMG = 'https://image.tmdb.org/t/p'

export const usingDemoCatalog = !TOKEN

const ANIMATION_GENRE = 16
const DOCUMENTARY_GENRE = 99
const ANIME_COUNTRIES = ['JP']

interface TmdbResult {
  id: number
  media_type: 'movie' | 'tv' | 'person'
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
  genre_ids?: number[]
  original_language?: string
  origin_country?: string[]
  vote_count?: number
  popularity?: number
}

function classify(r: TmdbResult): MediaType {
  const genres = r.genre_ids ?? []
  const japanese = r.original_language === 'ja' || r.origin_country?.some((c) => ANIME_COUNTRIES.includes(c))
  if (genres.includes(ANIMATION_GENRE) && japanese) return 'anime'
  if (genres.includes(DOCUMENTARY_GENRE)) return 'documentary'
  return r.media_type === 'movie' ? 'movie' : 'series'
}

function normalize(r: TmdbResult): Media {
  const date = r.release_date || r.first_air_date
  return {
    id: `tmdb:${r.media_type}:${r.id}`,
    title: r.title ?? r.name ?? 'Sin título',
    originalTitle: r.original_title ?? r.original_name,
    year: date ? Number(date.slice(0, 4)) : undefined,
    type: classify(r),
    posterUrl: r.poster_path ? `${IMG}/w342${r.poster_path}` : undefined,
    backdropUrl: r.backdrop_path ? `${IMG}/w780${r.backdrop_path}` : undefined,
    overview: r.overview || undefined,
  }
}

async function tmdb<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  url.search = new URLSearchParams({ language: LANGUAGE, ...params }).toString()
  const res = await fetch(url, { signal, headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' } })
  if (!res.ok) throw new Error(`TMDB respondió ${res.status}`)
  return res.json() as Promise<T>
}

const isTitle = (r: TmdbResult) => r.media_type === 'movie' || r.media_type === 'tv'

const onlyTitles = (results: TmdbResult[]) => results.filter(isTitle).map(normalize)

/**
 * TMDB ordena la búsqueda por parecido del texto, así que spin-offs o títulos
 * desconocidos con nombres parecidos tapan a lo que la gente busca. Mezclamos
 * su orden con cuánta gente votó el título (y cuán popular está ahora, para
 * que los estrenos no queden abajo de todo).
 */
function rankByRelevance(results: TmdbResult[]): TmdbResult[] {
  const score = (r: TmdbResult, position: number) =>
    Math.log10((r.vote_count ?? 0) + 1) + 0.5 * Math.log10((r.popularity ?? 0) + 1) - 0.2 * position
  return results
    .filter(isTitle)
    .map((r, i) => ({ r, s: score(r, i) }))
    .sort((a, b) => b.s - a.s)
    .map(({ r }) => r)
}

/** Lo más visto de la semana (o el catálogo demo). */
export async function trendingMedia(signal?: AbortSignal): Promise<Media[]> {
  if (!TOKEN) return DEMO
  const data = await tmdb<{ results: TmdbResult[] }>('/trending/all/week', {}, signal)
  return onlyTitles(data.results)
}

export async function searchMedia(query: string, signal?: AbortSignal): Promise<Media[]> {
  const q = query.trim()
  if (!q) return []
  if (!TOKEN) return searchDemo(q)

  const data = await tmdb<{ results: TmdbResult[] }>('/search/multi', { query: q, include_adult: 'false', page: '1' }, signal)
  return onlyTitles(rankByRelevance(data.results))
}

// ---------------------------------------------------------------------------
// Catálogo de ejemplo (modo demo, sin token)

const DEMO: Media[] = [
  { id: 'demo:tv:1', title: 'Breaking Bad', year: 2008, type: 'series', overview: 'Un profesor de química con cáncer terminal empieza a fabricar metanfetamina para asegurar el futuro de su familia.' },
  { id: 'demo:tv:2', title: 'The Bear', year: 2022, type: 'series', overview: 'Un chef de alta cocina vuelve a Chicago para hacerse cargo del local de sándwiches de su familia.' },
  { id: 'demo:tv:3', title: 'Succession', year: 2018, type: 'series', overview: 'La familia Roy pelea por el control de un imperio de medios mientras el patriarca se niega a retirarse.' },
  { id: 'demo:tv:4', title: 'Severance', year: 2022, type: 'series', overview: 'Empleados de una corporación se someten a un procedimiento que separa sus recuerdos laborales de los personales.' },
  { id: 'demo:movie:1', title: 'Relatos salvajes', year: 2014, type: 'movie', overview: 'Seis historias independientes sobre personas que pierden el control ante la injusticia cotidiana.' },
  { id: 'demo:movie:2', title: 'El secreto de sus ojos', year: 2009, type: 'movie', overview: 'Un oficial de justicia retirado escribe una novela sobre un crimen que lo marcó veinticinco años atrás.' },
  { id: 'demo:movie:3', title: 'Interestelar', year: 2014, type: 'movie', overview: 'Un grupo de exploradores viaja a través de un agujero de gusano en busca de un nuevo hogar para la humanidad.' },
  { id: 'demo:movie:4', title: 'Parásitos', year: 2019, type: 'movie', overview: 'Una familia pobre se infiltra, uno a uno, en la casa de una familia rica.' },
  { id: 'demo:movie:5', title: 'Dune: Parte dos', year: 2024, type: 'movie', overview: 'Paul Atreides se une a los Fremen mientras busca venganza contra quienes destruyeron a su familia.' },
  { id: 'demo:anime:1', title: 'Fullmetal Alchemist: Brotherhood', year: 2009, type: 'anime', overview: 'Dos hermanos alquimistas buscan la Piedra Filosofal para recuperar lo que perdieron.' },
  { id: 'demo:anime:2', title: 'Frieren', year: 2023, type: 'anime', overview: 'Una elfa maga revisita los lugares de su antigua aventura y aprende a entender a los humanos.' },
  { id: 'demo:anime:3', title: 'El viaje de Chihiro', year: 2001, type: 'anime', overview: 'Una nena queda atrapada en un mundo de espíritus y debe trabajar en una casa de baños para salvar a sus padres.' },
  { id: 'demo:anime:4', title: 'Attack on Titan', year: 2013, type: 'anime', overview: 'La humanidad sobrevive detrás de enormes murallas que la protegen de titanes devoradores de personas.' },
  { id: 'demo:doc:1', title: 'Free Solo', year: 2018, type: 'documentary', overview: 'Alex Honnold intenta escalar El Capitán sin cuerdas ni protección.' },
  { id: 'demo:doc:2', title: 'Nuestro planeta', year: 2019, type: 'documentary', overview: 'Una serie documental sobre la diversidad natural del planeta y las amenazas que enfrenta.' },
  { id: 'demo:doc:3', title: 'The Last Dance', year: 2020, type: 'documentary', overview: 'La última temporada de Michael Jordan con los Chicago Bulls, contada desde adentro.' },
]

function fold(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

async function searchDemo(q: string): Promise<Media[]> {
  await new Promise((r) => setTimeout(r, 250))
  const needle = fold(q)
  if (needle === '*') return DEMO
  return DEMO.filter((m) => fold(m.title).includes(needle) || fold(m.overview ?? '').includes(needle))
}

export const demoSuggestions = DEMO
