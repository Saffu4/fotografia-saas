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

// Siguiente número de pedido (00001, 00002...). Se toma el mayor número
// existente, no el último creado, para no repetir si alguien editó fechas.
export async function siguienteNumeroPedido() {
  const { data } = await supabase
    .from('orders')
    .select('order_number')
    .order('order_number', { ascending: false })
    .limit(50)
  const mayor = Math.max(0, ...(data ?? []).map((o) => parseInt(o.order_number, 10)).filter(Number.isFinite))
  return String(mayor + 1).padStart(5, '0')
}

// Elimina un abono y recalcula el saldo del pedido.
export async function eliminarAbono(pago) {
  const { error } = await supabase.from('payments').delete().eq('id', pago.id)
  if (error) return { error }
  return recalcularSaldo(pago.order_id)
}
