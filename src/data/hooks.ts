import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Item, Media, Status } from '@/types'
import { backend } from './index'

export const keys = {
  lists: ['lists'] as const,
  list: (id: string) => ['list', id] as const,
  members: (id: string) => ['members', id] as const,
  items: (id: string) => ['items', id] as const,
  reviews: (id: string) => ['reviews', id] as const,
  locate: (mediaId: string) => ['locate', mediaId] as const,
  invite: (code: string) => ['invite', code] as const,
}

// --- Lecturas -------------------------------------------------------------

export const useMyLists = () => useQuery({ queryKey: keys.lists, queryFn: backend.lists.mine })

export const useList = (id: string) => useQuery({ queryKey: keys.list(id), queryFn: () => backend.lists.get(id) })

export const useMembers = (id: string) =>
  useQuery({ queryKey: keys.members(id), queryFn: () => backend.lists.members(id) })

export const useItems = (id: string) => useQuery({ queryKey: keys.items(id), queryFn: () => backend.items.ofList(id) })

export const useReviews = (id: string) =>
  useQuery({ queryKey: keys.reviews(id), queryFn: () => backend.reviews.ofList(id) })

export const useLocate = (mediaId: string | undefined) =>
  useQuery({
    queryKey: keys.locate(mediaId ?? ''),
    queryFn: () => backend.items.locate(mediaId!),
    enabled: !!mediaId,
  })

export const useInvitePreview = (code: string) =>
  useQuery({ queryKey: keys.invite(code), queryFn: () => backend.lists.previewInvite(code) })

/** Mantiene las pantallas al día cuando otro miembro cambia algo (realtime). */
export function useRealtimeSync() {
  const qc = useQueryClient()
  useEffect(() => {
    if (!backend.subscribe) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = backend.subscribe(() => {
      // Agrupa ráfagas de eventos (ej. borrar una lista con muchos títulos)
      clearTimeout(timer)
      timer = setTimeout(() => {
        for (const key of [keys.lists, ['list'], ['members'], ['items'], ['reviews'], ['locate']]) {
          qc.invalidateQueries({ queryKey: key })
        }
      }, 300)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [qc])
}

// --- Escrituras -----------------------------------------------------------

export function useCreateList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backend.lists.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.lists }),
  })
}

export function useUpdateList(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { name?: string; emoji?: string }) => backend.lists.update(listId, patch),
    onSuccess: (list) => {
      qc.setQueryData(keys.list(listId), list)
      qc.invalidateQueries({ queryKey: keys.lists })
    },
  })
}

export function useRemoveList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backend.lists.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.lists }),
  })
}

export function useLeaveList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backend.lists.leave,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.lists }),
  })
}

export function useRegenerateInvite(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => backend.lists.regenerateInvite(listId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(listId) }),
  })
}

export function useJoinList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backend.lists.join,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.lists }),
  })
}

function invalidateList(qc: ReturnType<typeof useQueryClient>, listId: string) {
  qc.invalidateQueries({ queryKey: keys.items(listId) })
  qc.invalidateQueries({ queryKey: keys.reviews(listId) })
  qc.invalidateQueries({ queryKey: keys.lists })
  qc.invalidateQueries({ queryKey: ['locate'] })
}

export function useAddItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, media, status }: { listId: string; media: Media; status: Status }) =>
      backend.items.add(listId, media, status),
    onSuccess: (item) => invalidateList(qc, item.listId),
  })
}

export function useUpdateItem(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: Partial<Pick<Item, 'status' | 'progress' | 'finishedAt'>> }) =>
      backend.items.update(itemId, patch),
    // Optimista: el cambio de estado se ve al instante
    onMutate: async ({ itemId, patch }) => {
      await qc.cancelQueries({ queryKey: keys.items(listId) })
      const prev = qc.getQueryData<Item[]>(keys.items(listId))
      qc.setQueryData<Item[]>(keys.items(listId), (items) => items?.map((i) => (i.id === itemId ? { ...i, ...patch } : i)))
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(keys.items(listId), ctx.prev),
    onSettled: () => invalidateList(qc, listId),
  })
}

export function useRemoveItem(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backend.items.remove,
    onSuccess: () => invalidateList(qc, listId),
  })
}

export function useUpsertReview(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, rating, comment }: { itemId: string; rating?: number | null; comment?: string | null }) =>
      backend.reviews.upsert(itemId, { rating, comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.reviews(listId) }),
  })
}
