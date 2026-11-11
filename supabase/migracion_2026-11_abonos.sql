-- ============================================================
-- Migración noviembre 2026 — arreglo de abonos
-- Pegar en Supabase → SQL Editor → Run (una sola vez).
--
-- Problema: el "abono" que se escribía al crear el pedido se guardaba directo
-- en orders.advance, sin crear un registro en payments. Cuando luego se
-- registraba otro abono, el trigger recalculaba advance = SUMA(payments) y el
-- abono inicial desaparecía.
-- ============================================================

-- 1) Convertir en pago los abonos iniciales que aún no tienen registro
--    (pedidos donde advance es mayor que la suma de sus pagos).
insert into public.payments (user_id, order_id, amount, payment_date)
select o.user_id,
       o.id,
       o.advance - coalesce(p.suma, 0),
       o.created_at
from public.orders o
left join (
  select order_id, sum(amount) as suma from public.payments group by order_id
) p on p.order_id = o.id
where o.advance > coalesce(p.suma, 0);

-- 2) Recalcular abonado y saldo de todos los pedidos.
update public.orders o
set advance = coalesce((select sum(amount) from public.payments p where p.order_id = o.id), 0),
    balance = greatest(0, o.total - coalesce((select sum(amount) from public.payments p where p.order_id = o.id), 0));

-- 3) (Re)instalar el trigger por si no estaba creado en producción.
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

-- NOTA: los pedidos a los que YA se les agregó un segundo abono antes de este
-- arreglo perdieron el abono inicial (el trigger lo sobrescribió) y no se
-- puede recuperar automáticamente. Hay que revisarlos y registrar ese abono a
-- mano en Ver → Abonos / Pagos.
