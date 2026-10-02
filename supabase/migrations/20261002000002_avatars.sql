-- Foto de perfil: se guarda en Storage (bucket público "avatars", una carpeta
-- por usuario) y el perfil guarda la URL. Las cuentas de Google arrancan con
-- su foto de Google.

alter table public.profiles
  add column avatar_url text check (avatar_url ~ '^https://' and char_length(avatar_url) <= 500);

-- Cuentas de Google que ya existían: usan su foto de Google
update public.profiles p
set avatar_url = u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and u.raw_user_meta_data ->> 'avatar_url' ~ '^https://';

-- Cuentas nuevas: igual que antes, más la foto de Google si la hay
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, color, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ), 60),
    floor(random() * 8)::smallint,
    case when new.raw_user_meta_data ->> 'avatar_url' ~ '^https://'
      then left(new.raw_user_meta_data ->> 'avatar_url', 500) end
  );
  insert into lists (name, emoji, owner_id, is_personal) values ('Mi lista', '🍿', new.id, true);
  return new;
end $$;

-- La vista previa de invitaciones también muestra las fotos
create or replace function public.preview_invite(_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'list', to_jsonb(l) - 'invite_code',
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', p.id, 'name', p.name, 'color', p.color, 'avatar_url', p.avatar_url)
        order by m.joined_at
      )
      from list_members m join profiles p on p.id = m.user_id
      where m.list_id = l.id
    ), '[]'::jsonb)
  )
  from lists l
  where l.invite_code = upper(trim(_code))
$$;

-- ---------------------------------------------------------------------------
-- Storage: bucket público (las fotos se ven con su URL), máx. 1 MB, solo imágenes

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Cada uno solo toca su carpeta: avatars/<su id>/...
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
