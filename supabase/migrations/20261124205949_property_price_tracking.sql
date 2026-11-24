
-- DCI: registrar reducciones de precio

alter table public.properties
add column if not exists old_price numeric;

-- Funcion para registrar el precio anterior

create or replace function private.dci_track_price()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  -- Las propiedades nuevas no tienen precio anterior
  if tg_op = 'INSERT' then
    new.old_price := null;

  -- Si el precio disminuye, guardar el anterior
  elsif new.price < old.price then
    new.old_price := old.price;

  -- Si el precio aumenta, quitar la reduccion
  elsif new.price > old.price then
    new.old_price := null;

  -- Si no cambia, conservar el precio anterior
  else
    new.old_price := old.old_price;

  end if;

  return new;

end;
$$;

-- Activar el registro automatico

create trigger dci_track_property_price
before insert or update of price, old_price
on public.properties
for each row
execute function private.dci_track_price();
