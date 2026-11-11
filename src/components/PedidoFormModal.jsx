import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import Modal from './Modal'
import { ESTADOS_PEDIDO, opcionesCategoria, nombreCanonico } from '../lib/constantes'
import { recalcularSaldo } from '../lib/pedidos'

async function nextOrderNumber() {
  const { data } = await supabase
    .from('orders')
    .select('order_number')
    .order('created_at', { ascending: false })
    .limit(1)
  const last = data?.[0]?.order_number
  const lastNum = last ? parseInt(last, 10) : 0
  return String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(5, '0')
}

export default function PedidoFormModal({ order, onClose, onSaved }) {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    order_number: '',
    client_id: '',
    date: new Date().toISOString().slice(0, 10),
    work_type: 'Fotoshow',
    total: 0,
    advance: 0,
    responsible: '',
    status: 'Pendiente',
    observations: '',
  })

  useEffect(() => {
    supabase.from('clients').select('id, name, phone').order('name').then(({ data }) => {
      if (data) setClients(data)
    })

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
      nextOrderNumber().then((n) => setForm((f) => ({ ...f, order_number: n })))
    }
  }, [order])

  // Al editar, el abonado sale de la tabla de pagos (no se edita aquí).
  const abonado = order ? Number(order.advance || 0) : Number(form.advance || 0)
  const balance = Math.max(0, Number(form.total || 0) - abonado)

  async function handleSubmit(e) {
    e.preventDefault()
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
      let created
      ;({ data: created, error } = await supabase
        .from('orders')
        .insert({ ...payload, advance: 0, balance: payload.total, user_id: user.id })
        .select('id')
        .single())
      orderId = created?.id

      const abonoInicial = Number(form.advance) || 0
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
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
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
          <select
            required
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          >
            <option value="">Buscar cliente...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
            ))}
          </select>
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

        <div className="col-span-2">
          <label className="block text-sm mb-1 text-slate-300">Tipo de Trabajo *</label>
          <select
            required
            value={form.work_type}
            onChange={(e) => setForm({ ...form, work_type: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          >
            <option value="">Selecciona...</option>
            {opcionesCategoria(form.work_type).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm mb-1 text-slate-300">Observaciones</label>
          <textarea
            rows={3}
            placeholder="Detalles adicionales del pedido..."
            value={form.observations}
            onChange={(e) => setForm({ ...form, observations: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          />
        </div>

        <div className="col-span-2 flex justify-end gap-3 pt-2">
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
