-- ============================================================
-- Búsqueda de clientes sin importar tildes ni mayúsculas
-- ("sofia" encuentra a "Sofía León"). Pegar en Supabase → SQL Editor → Run.
-- Se puede correr más de una vez. No modifica datos.
-- ============================================================

create extension if not exists unaccent with schema extensions;

create or replace function public.buscar_clientes(q text, lim int default 50)
returns setof public.clients
language sql stable
set search_path = public, extensions
as $$
  select c.*
  from public.clients c
  where unaccent(lower(c.name)) like '%' || unaccent(lower(q)) || '%'
     or regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') like '%' || nullif(regexp_replace(q, '\D', '', 'g'), '') || '%'
     or unaccent(lower(coalesce(c.address, ''))) like '%' || unaccent(lower(q)) || '%'
  order by c.name
  limit lim;
$$;

-- La función respeta las mismas reglas de acceso de la tabla clients.
grant execute on function public.buscar_clientes(text, int) to authenticated;
