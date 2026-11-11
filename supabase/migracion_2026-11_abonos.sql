-- ============================================================
-- Migración noviembre 2026 — arreglo de abonos
-- Ajustada al esquema REAL de producción (payments no tiene user_id y no
-- hay triggers). Pegar en Supabase → SQL Editor → Run.
-- Se puede correr más de una vez: solo crea pagos donde faltan.
--
-- Problemas que corrige:
--  * El "abono" escrito al crear un pedido se guardaba solo en orders.advance,
--    sin registro en payments.
--  * Registrar abonos fallaba (el código enviaba payments.user_id, que no
--    existe) y no había trigger que actualizara el saldo.
-- ============================================================

begin;

-- 1) Convertir en pago los abonos iniciales que aún no tienen registro
--    (pedidos donde advance es mayor que la suma de sus pagos).
insert into public.payments (order_id, amount, payment_date)
select o.id,
       o.advance - coalesce(p.suma, 0),
       o.created_at
from public.orders o
left join (
  select order_id, sum(amount) as suma from public.payments group by order_id
) p on p.order_id = o.id
where o.advance > coalesce(p.suma, 0);

-- 2) Recalcular abonado y saldo de todos los pedidos a partir de los pagos.
update public.orders o
set advance = coalesce((select sum(amount) from public.payments p where p.order_id = o.id), 0),
    balance = greatest(0, o.total - coalesce((select sum(amount) from public.payments p where p.order_id = o.id), 0));

commit;

-- No se crea ningún trigger: la aplicación recalcula el saldo cada vez que
-- se registra un abono o se edita un pedido.
