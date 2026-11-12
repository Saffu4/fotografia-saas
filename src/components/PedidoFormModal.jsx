import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import Modal from './Modal'
import ClientePicker from './ClientePicker'
import { ESTADOS_PEDIDO, opcionesCategoria, nombreCanonico, fechaLocalInput } from '../lib/constantes'
import { recalcularSaldo, siguienteNumeroPedido } from '../lib/pedidos'

export default function PedidoFormModal({ order, onClose, onSaved }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    order_number: '',
    client_id: '',
    date: fechaLocalInput(new Date()),
    work_type: 'Fotoshow',
    total: 0,
    advance: 0,
    responsible: '',
    status: 'Pendiente',
    observations: '',
  })

  useEffect(() => {
    if (order) {
      setForm({
        order_number: order.order_number,
        client_id: order.client_id ?? '',
        date: order.date,
        work_type: nombreCanonico(order.work_type),
        total: order.total ?? 0,
        advance: order.advance ?? 0,
        responsible: order.responsible ?? '',
        status: order.status ?? 'Pendiente',
        observations: order.observations ?? '',
      })
    } else {
      siguienteNumeroPedido().then((n) => setForm((f) => ({ ...f, order_number: n })))
    }
  }, [order])

  // Al editar, el abonado sale de la tabla de pagos (no se edita aquí).
  const abonado = order ? Number(order.advance || 0) : Number(form.advance || 0)
  const balance = Math.max(0, Number(form.total || 0) - abonado)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.client_id) return alert('Elige un cliente.')
    const abonoInicial = Number(form.advance) || 0
    if (!order && abonoInicial > (Number(form.total) || 0)) {
      return alert('El abono inicial no puede ser mayor que el total.')
    }
    setSaving(true)

    const payload = {
      order_number: form.order_number,
      client_id: form.client_id || null,
      date: form.date,
      work_type: form.work_type,
      total: Number(form.total) || 0,
      responsible: form.responsible,
      status: form.status,
      observations: form.observations,
    }

    // El abono NO se guarda directo en orders.advance: se registra como un
    // pago en la tabla payments. Antes se guardaba directo y, al registrar el
    // siguiente abono, el trigger recalculaba advance = suma de pagos y el
    // abono inicial desaparecía.
    let error
    let orderId = order?.id
    if (order) {
      ;({ error } = await supabase.from('orders').update(payload).eq('id', order.id))
    } else {
      // Si otra persona tomó el mismo número al mismo tiempo, se intenta con
      // el siguiente (la base rechaza números repetidos con el código 23505).
      let created
      let numero = payload.order_number
      for (let intento = 0; intento < 5; intento++) {
        ;({ data: created, error } = await supabase
          .from('orders')
          .insert({ ...payload, order_number: numero, advance: 0, balance: payload.total, user_id: user.id })
          .select('id')
          .single())
        if (error?.code !== '23505') break
        numero = await siguienteNumeroPedido()
      }
      orderId = created?.id

      if (!error && abonoInicial > 0) {
        ;({ error } = await supabase.from('payments').insert({
          order_id: orderId, amount: abonoInicial,
        }))
      }
    }

    if (!error && orderId) ({ error } = await recalcularSaldo(orderId))

    setSaving(false)
    if (error) {
      alert('Error al guardar el pedido: ' + error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal title={order ? 'Editar Pedido' : 'Agregar Nuevo Pedido'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 text-slate-300">Número de Pedido (Auto)</label>
          <input
            disabled
            value={form.order_number}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg/60 border border-panel-border text-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">Total (COP) *</label>
          <input
            type="number" min="0" required
            value={form.total}
            onChange={(e) => setForm({ ...form, total: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-slate-300">Cliente *</label>
          <ClientePicker required value={form.client_id} onChange={(id) => setForm((f) => ({ ...f, client_id: id }))} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">{order ? 'Abonado (COP)' : 'Abono inicial (COP)'}</label>
          {order ? (
            <>
              <input
                disabled
                value={abonado.toLocaleString('es-CO')}
                className="w-full px-3 py-2 rounded-lg bg-panel-bg/60 border border-panel-border text-slate-400"
              />
              <p className="mt-1 text-xs text-slate-500">Para agregar abonos usa 👁️ Ver → Abonos / Pagos.</p>
            </>
          ) : (
            <input
              type="number" min="0"
              value={form.advance}
              onChange={(e) => setForm({ ...form, advance: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
            />
          )}
        </div>

        <div>
          <label className="block text-sm mb-1 text-slate-300">Fecha *</label>
          <input
            type="date" required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">Saldo Pendiente (COP)</label>
          <input
            disabled
            value={balance.toLocaleString('es-CO')}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg/60 border border-panel-border text-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-slate-300">Responsable *</label>
          <input
            required
            value={form.responsible}
            onChange={(e) => setForm({ ...form, responsible: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">Estado *</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          >
            {ESTADOS_PEDIDO.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="col-span-full">
          <label className="block text-sm mb-1 text-slate-300">Tipo de Trabajo *</label>
          <select
            required
            value={form.work_type}
            onChange={(e) => setForm({ ...form, work_type: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          >
            <option value="">Selecciona...</option>
            {opcionesCategoria(form.work_type, 'pedidos').map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="col-span-full">
          <label className="block text-sm mb-1 text-slate-300">Observaciones</label>
          <textarea
            rows={3}
            placeholder="Detalles adicionales del pedido..."
            value={form.observations}
            onChange={(e) => setForm({ ...form, observations: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          />
        </div>

        <div className="col-span-full flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-panel-border text-slate-300 hover:bg-white/5">
            Cancelar
          </button>
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'Guardando...' : order ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
