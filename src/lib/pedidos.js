import { supabase } from './supabaseClient'

// Recalcula abonado y saldo de un pedido a partir de la tabla de pagos.
// La base de datos tiene un trigger que hace lo mismo, pero lo repetimos aquí
// para no depender de que el trigger esté instalado en producción.
export async function recalcularSaldo(orderId) {
  const [{ data: order, error: e1 }, { data: pagos, error: e2 }] = await Promise.all([
    supabase.from('orders').select('total').eq('id', orderId).single(),
    supabase.from('payments').select('amount').eq('order_id', orderId),
  ])
  if (e1 || e2) return { error: e1 ?? e2 }

  const advance = (pagos ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const balance = Math.max(0, Number(order.total || 0) - advance)
  return supabase.from('orders').update({ advance, balance }).eq('id', orderId)
}
