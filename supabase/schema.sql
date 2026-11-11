-- ============================================================
-- Panel de Administración — esquema Supabase
-- Multi-tenant: cada fila pertenece a un user_id (auth.users.id)
-- Pega este script completo en Supabase → SQL Editor → Run
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
  user_id uuid not null references auth.users(id) on delete cascade,
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

-- ---------- Índices útiles ----------
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_client_id on public.orders(client_id);
create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_date on public.sessions(date);

-- ============================================================
-- Trigger: recalcular balance/estado del pedido cuando se agrega un pago
-- ============================================================
create or replace function public.recalc_order_balance()
returns trigger as $$
begin
  update public.orders o
    set advance = coalesce((select sum(amount) from public.payments p where p.order_id = o.id), 0),
        balance = greatest(0, o.total - coalesce((select sum(amount) from public.payments p where p.order_id = o.id), 0))
    where o.id = coalesce(new.order_id, old.order_id);
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_recalc_balance_ins on public.payments;
create trigger trg_recalc_balance_ins
after insert or update or delete on public.payments
for each row execute function public.recalc_order_balance();

-- ============================================================
-- Row Level Security: cada usuario solo ve/edita sus propios datos
-- ============================================================
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.order_observations enable row level security;
alter table public.payments enable row level security;
alter table public.sessions enable row level security;
alter table public.company_suggestions enable row level security;

-- CLIENTS
create policy "clients_select_own" on public.clients for select using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients for update using (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients for delete using (auth.uid() = user_id);

-- ORDERS
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders_update_own" on public.orders for update using (auth.uid() = user_id);
create policy "orders_delete_own" on public.orders for delete using (auth.uid() = user_id);

-- ORDER_OBSERVATIONS (scoped through parent order's user_id)
create policy "order_obs_select_own" on public.order_observations for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "order_obs_insert_own" on public.order_observations for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "order_obs_delete_own" on public.order_observations for delete
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- PAYMENTS
create policy "payments_select_own" on public.payments for select using (auth.uid() = user_id);
create policy "payments_insert_own" on public.payments for insert with check (auth.uid() = user_id);
create policy "payments_update_own" on public.payments for update using (auth.uid() = user_id);
create policy "payments_delete_own" on public.payments for delete using (auth.uid() = user_id);

-- SESSIONS
create policy "sessions_select_own" on public.sessions for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.sessions for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.sessions for update using (auth.uid() = user_id);
create policy "sessions_delete_own" on public.sessions for delete using (auth.uid() = user_id);

-- COMPANY_SUGGESTIONS (visible a todos los usuarios autenticados, buzón interno compartido)
create policy "suggestions_select_all" on public.company_suggestions for select using (auth.role() = 'authenticated');
create policy "suggestions_insert_all" on public.company_suggestions for insert with check (auth.role() = 'authenticated');
create policy "suggestions_delete_all" on public.company_suggestions for delete using (auth.role() = 'authenticated');
