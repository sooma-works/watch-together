# Watch 2gder

Listas compartidas de cosas para mirar: películas, series, anime y documentales.
Cada lista se puede compartir con quien quieras (pareja, amigos…) con un link o
código. El estado de cada título (viendo / quiero ver / vistos) es de la lista,
y cada persona deja su propio puntaje y comentario.

Mobile-first.

## Correr

```bash
npm install
npm run dev
```

### Búsqueda real (TMDB)

Sin configuración, la búsqueda usa un catálogo de ejemplo. Copiá `.env.example`
a `.env` y pegá tu **API Read Access Token** de
https://www.themoviedb.org/settings/api.

## Arquitectura

- `src/data/backend.ts` — contrato de la capa de datos (auth, listas, títulos, opiniones).
- `src/data/local.ts` — implementación local (localStorage). Simula varios usuarios
  en el mismo navegador: creá dos cuentas y compartí una lista con el código.
- `src/data/hooks.ts` — hooks de TanStack Query sobre el backend.
- `supabase/migrations/` — esquema SQL con RLS, triggers y RPCs para Supabase.
- `src/components/ui/` — componentes de [Cult UI](https://www.cult-ui.com)
  (vía shadcn): Family Drawer, Dynamic Island, Direction Aware Tabs, Rolling Number.

### Cambios locales a componentes de Cult UI

- `direction-aware-tabs`: estilos con los tokens del sistema, modo controlado (`value` / `onValueChange`) y sin la
  guarda `isAnimating`, que quedaba trabada y bloqueaba el cambio de tab.
- `family-drawer`: medición con `offsetSize` (la animación de escala achicaba la
  altura). Las transiciones entre vistas las hace `Sheet.tsx` en modo `wait`.

## Créditos

Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.
