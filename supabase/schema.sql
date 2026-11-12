-- ============================================================
-- Panel de Administración — esquema Supabase
-- Refleja la base de PRODUCCIÓN revisada el 11-nov-2026 (tablas, reglas de
-- acceso e índices). Úsalo para montar una base nueva desde cero:
-- Supabase → SQL Editor → pegar todo → Run.
-- Clientes y pedidos son de cada usuario; agenda, abonos, observaciones y
-- buzón los comparten todos los usuarios con sesión iniciada.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- CLIENTES ----------
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

-- ---------- PEDIDOS ----------
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null,
  client_id uuid references public.clients(id) on delete set null,
  date date not null default current_date,
  work_type text,               -- Fotoshow, Graduandos, Yudith, Gustavo, Maye, Eventos (ver src/lib/constantes.js)
  total numeric(12,2) not null default 0,
  advance numeric(12,2) not null default 0,   -- abono
  balance numeric(12,2) not null default 0,   -- saldo pendiente
  status text not null default 'Pendiente',   -- Pendiente, En edición, Cola de impresión, Entregado, Cancelado
  responsible text,
  observations text,
  photos_url text,                 -- enlace de las fotos (Drive, WeTransfer…)
  created_at timestamptz not null default now()
);

-- ---------- OBSERVACIONES DE PEDIDO (historial de notas) ----------
create table if not exists public.order_observations (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- ABONOS / PAGOS ----------
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- AGENDA / SESIONES ----------
create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  date timestamptz not null,
  studio text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- BUZÓN INTERNO / SUGERENCIAS ----------
create table if not exists public.company_suggestions (
  id uuid primary key default uuid_generate_v4(),
  author_name text,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- Índices ----------
create unique index if not exists orders_order_number_unico on public.orders (order_number);
create index if not exists orders_date_idx        on public.orders (date desc);
create index if not exists orders_client_idx      on public.orders (client_id);
create index if not exists orders_status_idx      on public.orders (status);
create index if not exists payments_order_idx     on public.payments (order_id);
create index if not exists sessions_date_idx      on public.sessions (date);
create index if not exists sessions_client_idx    on public.sessions (client_id);
create index if not exists observations_order_idx on public.order_observations (order_id);

-- El saldo (advance / balance) lo recalcula la aplicación al registrar o
-- eliminar un abono (src/lib/pedidos.js). No hay triggers.

-- ============================================================
-- Reglas de acceso (Row Level Security)
-- ============================================================
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.order_observations enable row level security;
alter table public.payments enable row level security;
alter table public.sessions enable row level security;
alter table public.company_suggestions enable row level security;

create policy clients_select on public.clients for select using (auth.uid() = user_id);
create policy clients_insert on public.clients for insert with check (auth.uid() = user_id);
create policy clients_update on public.clients for update using (auth.uid() = user_id);
create policy clients_delete on public.clients for delete using (auth.uid() = user_id);

create policy orders_select on public.orders for select using (auth.uid() = user_id);
create policy orders_insert on public.orders for insert with check (auth.uid() = user_id);
create policy orders_update on public.orders for update using (auth.uid() = user_id);
create policy orders_delete on public.orders for delete using (auth.uid() = user_id);

create policy "Enable all for auth users" on public.order_observations for all using (auth.role() = 'authenticated');
create policy "Enable all for auth users" on public.payments for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.sessions for all using (auth.role() = 'authenticated');
create policy "Enable all for auth users" on public.company_suggestions for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
