-- Watch Together — esquema inicial
-- Listas compartibles, títulos con estado compartido y una opinión por persona.
-- Las reglas de acceso (RLS) replican las de src/data/local.ts.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tablas

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  color      smallint not null default 0 check (color between 0 and 7),
  created_at timestamptz not null default now()
);

create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  emoji       text not null default '🍿',
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique,
  is_personal boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.list_members (
  list_id   uuid not null references public.lists (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index list_members_user_idx on public.list_members (user_id);

create table public.items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists (id) on delete cascade,
  media_id    text not null,           -- ej. 'tmdb:tv:1396'
  media       jsonb not null,          -- snapshot normalizado (título, póster, tipo…)
  status      text not null check (status in ('watching', 'completed', 'planned')),
  progress    jsonb,                   -- { season, episode }
  added_by    uuid references public.profiles (id) on delete set null,
  finished_at date,
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (list_id, media_id)
);
create index items_media_idx on public.items (media_id);

create table public.reviews (
  item_id    uuid not null references public.items (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  rating     numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  comment    text check (char_length(comment) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Helpers

-- pgcrypto vive en el schema `extensions` en Supabase: se llama con el schema
-- explícito porque varias funciones fijan search_path = public.
create or replace function public.gen_invite_code() returns text
language sql volatile set search_path = public, extensions as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 32), 1), '')
  from extensions.gen_random_bytes(6) as b, generate_series(0, 5) as i
$$;

-- security definer: evita recursión de RLS al consultar list_members desde sus propias políticas
create or replace function public.is_member(_list_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from list_members where list_id = _list_id and user_id = auth.uid())
$$;

create or replace function public.is_owner(_list_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lists where id = _list_id and owner_id = auth.uid())
$$;

create or replace function public.shares_list_with(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from list_members a join list_members b using (list_id)
    where a.user_id = auth.uid() and b.user_id = _user_id
  )
$$;

-- ---------------------------------------------------------------------------
-- Triggers

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

-- Al pasar a "completed" se registra la fecha si no tenía
create or replace function public.items_set_finished() returns trigger
language plpgsql as $$
begin
  if new.status = 'completed' and new.finished_at is null then
    new.finished_at := current_date;
  end if;
  return new;
end $$;

create trigger items_finished before insert or update of status on public.items
  for each row execute function public.items_set_finished();

-- Código de invitación automático y el creador entra como owner
create or replace function public.lists_before_insert() returns trigger
language plpgsql as $$
begin
  new.invite_code := public.gen_invite_code();  -- nunca lo elige el cliente
  return new;
end $$;

create or replace function public.lists_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into list_members (list_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end $$;

create trigger lists_bi before insert on public.lists
  for each row execute function public.lists_before_insert();
create trigger lists_ai after insert on public.lists
  for each row execute function public.lists_after_insert();

-- Cada cuenta nueva (email o Google) tiene perfil y su lista personal
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, color)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ), 60),
    floor(random() * 8)::smallint
  );
  insert into lists (name, emoji, owner_id, is_personal) values ('Mi lista', '🍿', new.id, true);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs (invitaciones)

-- Vista previa pública de una invitación (no hace falta ser miembro)
create or replace function public.preview_invite(_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'list', to_jsonb(l) - 'invite_code',
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'color', p.color) order by m.joined_at)
      from list_members m join profiles p on p.id = m.user_id
      where m.list_id = l.id
    ), '[]'::jsonb)
  )
  from lists l
  where l.invite_code = upper(trim(_code))
$$;

create or replace function public.join_list(_code text) returns public.lists
language plpgsql security definer set search_path = public as $$
declare
  _list lists;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión.';
  end if;
  select * into _list from lists where invite_code = upper(trim(_code));
  if not found then
    raise exception 'Ese código no existe o ya no es válido.';
  end if;
  insert into list_members (list_id, user_id) values (_list.id, auth.uid())
  on conflict do nothing;
  return _list;
end $$;

create or replace function public.regenerate_invite(_list_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  _code text := gen_invite_code();
begin
  update lists set invite_code = _code where id = _list_id and owner_id = auth.uid();
  if not found then
    raise exception 'Solo quien creó la lista puede cambiar el código.';
  end if;
  return _code;
end $$;

-- ---------------------------------------------------------------------------
-- RLS

alter table public.profiles     enable row level security;
alter table public.lists        enable row level security;
alter table public.list_members enable row level security;
alter table public.items        enable row level security;
alter table public.reviews      enable row level security;

-- profiles: me veo a mí y a quienes comparten alguna lista conmigo
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.shares_list_with(id));
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- lists
-- owner_id = auth.uid(): al crear una lista con insert…returning, la membresía
-- la agrega un trigger AFTER que la política todavía no ve.
create policy lists_select on public.lists for select
  using (owner_id = auth.uid() or public.is_member(id));
create policy lists_insert on public.lists for insert
  with check (owner_id = auth.uid() and is_personal = false);
create policy lists_update on public.lists for update
  using (public.is_member(id)) with check (public.is_member(id));
create policy lists_delete on public.lists for delete
  using (owner_id = auth.uid() and is_personal = false);

-- El código y la propiedad solo cambian vía regenerate_invite / nunca
create or replace function public.lists_guard_update() returns trigger
language plpgsql as $$
begin
  if new.owner_id <> old.owner_id or new.is_personal <> old.is_personal then
    raise exception 'No se puede cambiar el dueño ni el tipo de lista.';
  end if;
  if new.invite_code <> old.invite_code and not public.is_owner(old.id) then
    raise exception 'Solo quien creó la lista puede cambiar el código.';
  end if;
  return new;
end $$;

create trigger lists_guard before update on public.lists
  for each row execute function public.lists_guard_update();

-- list_members: altas solo por trigger/RPC; salir de una lista (si no sos owner)
create policy members_select on public.list_members for select using (public.is_member(list_id));
create policy members_leave on public.list_members for delete
  using (user_id = auth.uid() and role <> 'owner');

-- items: cualquier miembro de la lista
create policy items_select on public.items for select using (public.is_member(list_id));
create policy items_insert on public.items for insert
  with check (public.is_member(list_id) and added_by = auth.uid());
create policy items_update on public.items for update
  using (public.is_member(list_id)) with check (public.is_member(list_id));
create policy items_delete on public.items for delete using (public.is_member(list_id));

-- reviews: todos los miembros las ven; cada uno edita solo la suya
create policy reviews_select on public.reviews for select
  using (exists (select 1 from items i where i.id = item_id and public.is_member(i.list_id)));
create policy reviews_insert on public.reviews for insert
  with check (user_id = auth.uid() and exists (select 1 from items i where i.id = item_id and public.is_member(i.list_id)));
create policy reviews_update on public.reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_delete on public.reviews for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: ver al instante lo que agrega o califica el resto

alter publication supabase_realtime add table public.items, public.reviews, public.list_members;
