# AGENTS.md — Watch Together

Contexto para agentes de IA que trabajen en este repo. Leelo completo antes de
tocar código: resume qué es la app, qué se decidió y por qué, y cómo seguir.

## Cómo trabajar con el usuario

- El usuario (Nico) habla en **español rioplatense**. Respondele en español, con voseo.
- Todo el texto de la interfaz va en **español rioplatense con voseo** ("Buscá", "Tenés", "Calificá").
- Le gusta iterar de a pasos y suele delegar las decisiones técnicas y de diseño:
  decidí con criterio, explicá brevemente por qué y preguntá solo lo que de verdad
  sea suyo (cuentas, credenciales, nombres, gustos).
- Verificá los cambios visuales en el navegador **en tamaño celular (375×812)** antes de darlos por terminados.

## Qué es

Web app **mobile-first** para llevar **listas compartidas de cosas para mirar**
(películas, series, anime, documentales). Una especie de Goodreads para pantallas.

- Cada usuario arranca con una lista personal ("Mi lista") y puede crear más
  ("Con Sofi", "Los pibes", "Anime"…).
- **Cualquier lista se puede compartir** con quien quiera (pareja, amigos) con un
  link `/unirse/CODIGO` o el código de 6 caracteres.
- Cada título de una lista tiene un **estado compartido**: Viendo / Quiero ver / Vistos,
  más progreso (temporada/episodio) para series y anime.
- **Puntaje (0.5–5, medias estrellas) y comentario son por persona.** Se muestra
  la opinión de cada miembro y el promedio del grupo.
- El nombre **"Watch Together" es definitivo** (el usuario descartó cambiarlo).

## Estado actual (v0.2)

Funciona de punta a punta con un **backend local** (localStorage) que simula
varios usuarios en el mismo navegador. Para probar compartir: crear cuenta A,
crear lista, copiar código, cerrar sesión, crear cuenta B, entrar a `/unirse/CODIGO`.

- Login: email + contraseña (local) y "Google" (en local entra con una cuenta demo).
- Búsqueda: TMDB si existe `VITE_TMDB_TOKEN`; si no, catálogo demo de 16 títulos.
- **Supabase todavía NO está conectado** (el usuario aún no creó el proyecto).
  El esquema SQL ya está escrito pero **nunca se ejecutó contra una base real**.

## Stack

- React 19 + Vite 8 + TypeScript 7 (`tsc -b` en el build) + Tailwind CSS v4
- React Router 7, TanStack Query 5, `motion` (Framer Motion), `vaul` (drawers)
- shadcn (estilo `base-nova`) para instalar componentes de **Cult UI**
- Fuentes: Geist Variable + Geist Mono Variable (`@fontsource-variable/*`)
- Alias `@/` → `src/`

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # para abrirla desde el celular en la misma red
npm run build          # typecheck + build: debe pasar limpio antes de commitear
```

Variables (`.env`, ver `.env.example`; **nunca commitear `.env`**):
`VITE_TMDB_TOKEN`, y a futuro `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Arquitectura

```
src/
  types.ts              Modelo: Media, Profile, List, Member, Item, Review, ListSummary + labels
  data/
    backend.ts          CONTRATO de la capa de datos (interfaz Backend)
    local.ts            Implementación local (localStorage) que replica las reglas de RLS
    index.ts            Elige el backend (hoy siempre local)
    hooks.ts            Hooks de TanStack Query (lecturas + mutaciones, query keys)
  lib/
    auth.tsx            AuthProvider / useAuth / useMe (escucha backend.auth.onChange)
    catalog.ts          Búsqueda/tendencias en TMDB + catálogo demo; clasifica anime/documental
    utils.ts            cn()
  components/
    ui/                 Componentes de Cult UI instalados con shadcn (código propio, editable)
    Sheet.tsx           Wrapper del Family Drawer con vistas animadas (useSheetView)
    ItemSheet.tsx       Detalle de título: estado, progreso, opiniones por persona, calificar
    ListSheets.tsx      Crear lista, compartir, ajustes, unirse con código, agregar a lista
    Toast.tsx           Notificaciones con la Dynamic Island (useToast)
    BottomNav, Avatar, Poster, StatusDot, StarRating, TypeBadge, Button (Btn), AppShell
  pages/                Login, Home (listas), List, Search, Join (/unirse/:code), Profile
supabase/migrations/    Esquema SQL con RLS, triggers y RPCs
```

**Regla clave:** las pantallas solo hablan con `src/data/hooks.ts` (y `backend.auth`).
Nunca acceder a localStorage ni a Supabase directo desde un componente. Así el
backend se reemplaza sin tocar la UI.

## Sistema visual (respetarlo)

El usuario **rechazó** un primer diseño con degradés, brillos, serif y fondos con
manchas de color. Lo que quiere: **plano, discreto, sans + mono**, sin perder las
interacciones novedosas.

- Tokens en `src/index.css`: neutros casi negros en escalones (`bg`, `surface`,
  `surface-2`, `surface-3`), bordes `line` / `line-strong`, texto `fg` / `dim` / `faint`.
- **Un solo acento: `signal` (naranja #ff6b3d), usado con cuentagotas** (CTA de agregar,
  calificar, estrellas, promedio, punto final de los títulos).
- Lo "activo" se marca en blanco hueso (`bg-fg text-bg`), no con color.
- Colores de estado: `st-watching` (naranja, titila), `st-planned` (lila), `st-completed` (verde), vía `<StatusDot>`.
- Tipografía: **Geist** para texto y títulos (utilidad `heading`); **Geist Mono** para
  etiquetas, metadatos, números, códigos (utilidad `label`: mono, mayúsculas, 10.5px).
- Utilidades propias: `label`, `heading`, `panel`, `bar`, `dotgrid`, `no-scrollbar`, `pt-safe`, `pb-safe`.
- Bordes de 1px en lugar de sombras. **No** volver a meter degradés, glow, blur
  decorativo, grano ni fuentes serif.
- Mantener las animaciones: pill de la barra inferior (`layoutId`), tabs direccionales,
  drawers con vistas, Dynamic Island, números que ruedan, entradas escalonadas.

## Componentes de Cult UI: cambios locales (no pisarlos)

Se instalan con `npx shadcn@latest add @cult-ui/<nombre>`. Ojo: re-instalar con
`--overwrite` borra estos arreglos.

- `direction-aware-tabs`: modo controlado (`value`/`onValueChange`), estilos con los
  tokens, y **sin la guarda `isAnimating`** (quedaba trabada en `true` y bloqueaba los clicks).
- `family-drawer`: `useMeasure({ offsetSize: true })` (con `getBoundingClientRect` la
  animación de escala achicaba la altura y cortaba el contenido). Además, el CLI con
  estilo `base-nova` reescribe `asChild` → `render`, lo que **rompe vaul** (que es Radix):
  si se reinstala, restaurar el archivo original del registro.
- Las transiciones entre vistas del drawer las hace `Sheet.tsx` con `AnimatePresence mode="wait"`.
  **No usar `FamilyDrawerAnimatedContent`**: su `popLayout` dejaba copias invisibles ocupando espacio.
- `dynamic-island`: su `setSize` bloquea volver al tamaño anterior; `Toast.tsx` usa `dispatch` directo.
- **RareUI** se evaluó y se descartó: sus componentes figuraban "not available yet" y su
  licencia exige crédito visible.

## Próximo paso: Supabase

Decidido: **Supabase** como backend, con login **Google + email/contraseña**.

1. El usuario tiene que crear el proyecto y pasar la Project URL y la anon key (son públicas).
2. Aplicar `supabase/migrations/20261002000000_init.sql` y **probarlo** (no se ejecutó nunca).
   Incluye: tablas `profiles`, `lists`, `list_members`, `items`, `reviews`; RLS con helpers
   `is_member` / `is_owner` / `shares_list_with` (security definer); trigger que crea perfil +
   "Mi lista" al registrarse; RPCs `preview_invite`, `join_list`, `regenerate_invite`; realtime
   en `items`, `reviews`, `list_members`.
3. Implementar `src/data/supabase.ts` cumpliendo la interfaz `Backend` (mapear snake_case ↔ camelCase)
   y elegirlo en `src/data/index.ts` cuando existan las variables de entorno.
4. Suscribirse a realtime para invalidar las queries de React Query cuando otro miembro cambia algo.
5. Google OAuth: el usuario necesita crear credenciales en Google Cloud (guiarlo).
6. Después: deploy (ej. Vercel) para usarla desde el celular y compartir con otros; PWA instalable.

Ideas pendientes mencionadas: reacciones a opiniones de otros miembros, sección
"viendo ahora" en la home, code-splitting (el bundle supera 500 kB).

## Git

- Repo: `github.com/sooma-works/watch-together`, rama `main`.
- Autor de los commits en este repo: `sooma-works <sooma.works@gmail.com>` (configurado
  **local** al repo, no global; en otra máquina hay que volver a configurarlo con `git config user.name/user.email`).
- SSH: el remoto usa el alias `github-sooma` (`git@github-sooma:sooma-works/watch-together.git`),
  definido en `~/.ssh/config` con la clave `id_ed25519_sooma`. En otra máquina hay que
  replicar ese alias o cambiar el remoto.
- Para trabajos grandes (ej. Supabase), usar una rama y abrir un pull request.
- Correr `npm run build` antes de commitear. Mensajes de commit en español.

## Créditos obligatorios

- TMDB: "Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB."
  (está en el pie de Perfil; mantenerlo).
- Cult UI: crédito en el pie de Perfil.
