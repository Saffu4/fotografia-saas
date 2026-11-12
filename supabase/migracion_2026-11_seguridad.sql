-- ============================================================
-- Migración noviembre 2026 (2) — seguridad, orden y velocidad
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- No borra ningún dato.
-- ============================================================

begin;

-- 1) Buzón interno: solo usuarios con sesión iniciada pueden leer/escribir.
--    (Antes no tenía reglas: o no funcionaba, o quedaba abierto a cualquiera.)
do $$
begin
  if to_regclass('public.company_suggestions') is not null then
    execute 'alter table public.company_suggestions enable row level security';
    execute 'drop policy if exists "Enable all for auth users" on public.company_suggestions';
    execute $p$create policy "Enable all for auth users" on public.company_suggestions
             for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated')$p$;
  else
    raise notice 'La tabla company_suggestions no existe; se crea.';
    create table public.company_suggestions (
      id uuid primary key default gen_random_uuid(),
      author_name text,
      content text not null,
      created_at timestamptz not null default now()
    );
    alter table public.company_suggestions enable row level security;
    create policy "Enable all for auth users" on public.company_suggestions
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;

-- 2) Unificar nombres de categorías escritos a mano antes de las listas
--    desplegables ("judith", "graduandos ", "evento"...), para que los
--    filtros y reportes los cuenten juntos.
update public.orders   set work_type = 'Yudith'      where lower(trim(work_type)) in ('yudith','judith');
update public.orders   set work_type = 'Graduandos'  where lower(trim(work_type)) in ('graduandos','graduando');
update public.orders   set work_type = 'Eventos'     where lower(trim(work_type)) in ('eventos','evento');
update public.orders   set work_type = 'Fotoshow'    where lower(trim(work_type)) in ('fotoshow','estudio','photoshop');
update public.orders   set work_type = 'Gustavo'     where lower(trim(work_type)) = 'gustavo'    and work_type <> 'Gustavo';
update public.orders   set work_type = 'Maye'        where lower(trim(work_type)) = 'maye'       and work_type <> 'Maye';
update public.orders   set work_type = 'Marquetería' where lower(trim(work_type)) in ('marqueteria','marquetería','marco','marcos');
update public.sessions set studio    = 'Yudith'      where lower(trim(studio)) in ('yudith','judith');
update public.sessions set studio    = 'Graduandos'  where lower(trim(studio)) in ('graduandos','graduando');
update public.sessions set studio    = 'Eventos'     where lower(trim(studio)) in ('eventos','evento');
update public.sessions set studio    = 'Fotoshow'    where lower(trim(studio)) in ('fotoshow','estudio','photoshop');
update public.sessions set studio    = 'Gustavo'     where lower(trim(studio)) = 'gustavo'    and studio <> 'Gustavo';
update public.sessions set studio    = 'Maye'        where lower(trim(studio)) = 'maye'       and studio <> 'Maye';
update public.sessions set studio    = 'Sonido'      where lower(trim(studio)) = 'sonido'     and studio <> 'Sonido';

-- 3) Número de pedido único (evita dos pedidos con el mismo número).
--    Solo se activa si hoy no hay números repetidos; si los hay, avisa.
do $$
declare repetidos int;
begin
  select count(*) into repetidos from (
    select order_number from public.orders group by order_number having count(*) > 1
  ) t;
  if repetidos = 0 then
    create unique index if not exists orders_order_number_unico on public.orders (order_number);
  else
    raise notice 'Hay % números de pedido repetidos; corrígelos y vuelve a correr este script.', repetidos;
  end if;
end $$;

-- 4) Índices para que búsquedas, agenda y reportes carguen rápido.
create index if not exists orders_date_idx        on public.orders (date desc);
create index if not exists orders_client_idx      on public.orders (client_id);
create index if not exists orders_status_idx      on public.orders (status);
create index if not exists payments_order_idx     on public.payments (order_id);
create index if not exists sessions_date_idx      on public.sessions (date);
create index if not exists sessions_client_idx    on public.sessions (client_id);
create index if not exists observations_order_idx on public.order_observations (order_id);

commit;

-- Para ver si quedaron números de pedido repetidos (debe salir vacío):
-- select order_number, count(*) from public.orders group by 1 having count(*) > 1;
