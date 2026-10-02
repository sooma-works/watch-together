-- El código de invitación solo cambia vía regenerate_invite (código aleatorio).
-- Antes, el dueño podía elegir uno a mano con un update directo, y un código
-- elegido (ej. 'AAAAAA') es fácil de adivinar.

create or replace function public.regenerate_invite(_list_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  _code text := gen_invite_code();
  _updated int;
begin
  perform set_config('wt.regenerating_invite', 'on', true);  -- habilita el cambio en lists_guard
  update lists set invite_code = _code where id = _list_id and owner_id = auth.uid();
  get diagnostics _updated = row_count;
  perform set_config('wt.regenerating_invite', 'off', true);
  if _updated = 0 then
    raise exception 'Solo quien creó la lista puede cambiar el código.';
  end if;
  return _code;
end $$;

create or replace function public.lists_guard_update() returns trigger
language plpgsql as $$
begin
  if new.owner_id <> old.owner_id or new.is_personal <> old.is_personal then
    raise exception 'No se puede cambiar el dueño ni el tipo de lista.';
  end if;
  if new.invite_code <> old.invite_code
     and coalesce(current_setting('wt.regenerating_invite', true), 'off') <> 'on' then
    raise exception 'Solo quien creó la lista puede cambiar el código.';
  end if;
  return new;
end $$;
