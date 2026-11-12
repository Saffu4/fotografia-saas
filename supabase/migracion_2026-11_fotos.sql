-- ============================================================
-- Enlace de las fotos en cada pedido (Drive, WeTransfer, etc.)
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- ============================================================
alter table public.orders add column if not exists photos_url text;
