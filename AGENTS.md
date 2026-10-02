# AGENTS.md — Watch 2gder

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
- El nombre es **"Watch 2gder"** (antes "Watch Together"; lo cambió el usuario el 2026-10-02, en línea con el dominio watch2gder.netlify.app). El repo y el paquete siguen llamándose `watch-together`.

## Estado actual (v0.3)

**En producción:** https://watch2gder.netlify.app (Netlify despliega `main` solo; config en `netlify.toml`).

- **Backend:** Supabase (proyecto `cissbxlzmborixlxjxcm`, São Paulo) si están `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`; si no, el backend local (localStorage) que simula varios usuarios en
  el mismo navegador. Las 3 migraciones de `supabase/migrations/` ya están aplicadas (se corren a mano
  en el SQL Editor del panel; el usuario las pega). Probado contra la base real: app + RLS.
- **Login:** Google (proyecto de Google Cloud `watch2gder`, app publicada) + email/contraseña.
  "Confirm email" está **apagado a propósito**: el SMTP por defecto de Supabase solo manda mails a
  integrantes de la organización; para activarlo hace falta SMTP propio (ej. Resend) y un dominio.
- **Búsqueda:** TMDB (ordenada mezclando relevancia con votos/popularidad); sin token, catálogo demo.
- **Perfil:** nombre, color y foto (Storage, bucket `avatars`, recortada a 320px webp en el cliente;
  las cuentas de Google arrancan con su foto de Google).
- **PWA instalable:** `public/manifest.webmanifest`, `public/sw.js` (solo en producción), íconos en `public/icons/`.
- **Privacidad:** página pública `/privacidad` (la exige Google para publicar el login).
- **Firma "Hecho por sooma."** en el login y el pie de Perfil (`SoomaSignature`, variante para fondo oscuro).

Para probar sin tocar la base real: `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev` usa el backend local.

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
    supabase.ts         Implementación real sobre Supabase (+ realtime con `subscribe`)
    local.ts            Implementación local (localStorage) que replica las reglas de RLS
    index.ts            Elige el backend: Supabase si hay variables de entorno, si no local
    hooks.ts            Hooks de TanStack Query (lecturas + mutaciones, query keys)
  lib/
    auth.tsx            AuthProvider / useAuth / useMe (escucha backend.auth.onChange)
    catalog.ts          Búsqueda/tendencias en TMDB + catálogo demo; clasifica anime/documental
    image.ts            Recorte cuadrado de la foto de perfil (webp)
    utils.ts            cn()
  components/
    ui/                 Componentes de Cult UI instalados con shadcn (código propio, editable)
    Sheet.tsx           Wrapper del Family Drawer con vistas animadas (useSheetView)
    ItemSheet.tsx       Detalle de título: estado, progreso, opiniones por persona, calificar
    ListSheets.tsx      Crear lista, compartir, ajustes, unirse con código, agregar a lista
    Toast.tsx           Notificaciones con la Dynamic Island (useToast)
    BottomNav, Avatar, Poster, StatusDot, StarRating, TypeBadge, Button (Btn), AppShell
  pages/                Login, Home (listas), List, Search, Join (/unirse/:code), Profile, Privacy
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

## Pendientes

- Activar "Confirm email" cuando haya dominio propio + SMTP (Resend).
- Ideas mencionadas: reacciones a opiniones de otros miembros, sección "viendo ahora" en la home,
  code-splitting (el bundle supera 500 kB).

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
- Sooma: firma "Hecho por sooma." (login y pie de Perfil).
