import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import Modal from './Modal'
import ClientePicker from './ClientePicker'
import CampoDinero from './CampoDinero'
import { ESTADOS_PEDIDO, opcionesCategoria, nombreCanonico, fechaLocalInput, opcionesResponsable, nombreResponsable } from '../lib/constantes'
import { recalcularSaldo, siguienteNumeroPedido } from '../lib/pedidos'
import { aPesosNumero, pesos } from '../lib/utilidades'
import { avisar, confirmar } from './Avisos'

export default function PedidoFormModal({ order, inicial, onClose, onSaved }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    order_number: '',
    client_id: '',
    date: fechaLocalInput(new Date()),
    work_type: '',
    total: '',
    advance: '',
    responsible: '',
    status: 'Pendiente',
    observations: '',
    ...(order ? {} : inicial ?? {}), // datos que vienen de una cita
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
        responsible: nombreResponsable(order.responsible),
        status: order.status ?? 'Pendiente',
        observations: order.observations ?? '',
      })
    } else {
      siguienteNumeroPedido().then((n) => setForm((f) => ({ ...f, order_number: n })))
    }
  }, [order])

  // Al editar, el abonado sale de la tabla de pagos (no se edita aquí).
  const abonado = order ? Number(order.advance || 0) : aPesosNumero(form.advance)
  const balance = Math.max(0, aPesosNumero(form.total) - abonado)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.client_id) return avisar('Elige un cliente.', 'error')
    const abonoInicial = aPesosNumero(form.advance)
    if (!order && abonoInicial > aPesosNumero(form.total)) {
      return avisar('El abono inicial no puede ser mayor que el total.', 'error')
    }
    if (order && form.status === 'Entregado' && order.status !== 'Entregado' && Number(order.balance) > 0 && !(await confirmar(
      `Este pedido todavía debe ${pesos(order.balance)}.\n¿Guardarlo como Entregado de todas formas?`,
      { titulo: 'Entregar con saldo pendiente', aceptar: 'Sí, guardar' }
    ))) return
    setSaving(true)

    const payload = {
      order_number: form.order_number,
      client_id: form.client_id || null,
      date: form.date,
      work_type: form.work_type,
      total: aPesosNumero(form.total),
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
      avisar('Error al guardar el pedido: ' + error.message, 'error')
      return
    }
    avisar(order ? 'Pedido actualizado' : `Pedido #${payload.order_number} creado`)
    onSaved({ id: orderId, nuevo: !order })
  }

  return (
    <Modal title={order ? 'Editar Pedido' : 'Agregar Nuevo Pedido'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-full flex items-center justify-between text-sm text-slate-400">
          <span>Pedido <b className="text-slate-200">#{form.order_number || '…'}</b></span>
          <span className="text-xs">El número se asigna solo</span>
        </div>

        <div className="col-span-full">
          <label className="block text-sm mb-1 text-slate-300">Cliente *</label>
          <ClientePicker required value={form.client_id} onChange={(id) => setForm((f) => ({ ...f, client_id: id }))} />
        </div>

        <div>
          <label className="block text-sm mb-1 text-slate-300">Tipo de trabajo *</label>
          <select
            required
            value={form.work_type}
            onChange={(e) => setForm({ ...form, work_type: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          >
            <option value="">Elige el tipo...</option>
            {opcionesCategoria(form.work_type, 'pedidos').map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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
          <label className="block text-sm mb-1 text-slate-300">Total *</label>
          <CampoDinero
            required
            value={form.total}
            onChange={(v) => setForm((f) => ({ ...f, total: v }))}
            className="py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">{order ? 'Abonado' : 'Abono inicial'}</label>
          {order ? (
            <>
              <div className="px-3 py-2 text-slate-200">{pesos(abonado)}</div>
              <p className="text-xs text-slate-500">Los abonos se agregan en 👁️ Ver → Abonos / Pagos.</p>
            </>
          ) : (
            <CampoDinero
              value={form.advance}
              onChange={(v) => setForm((f) => ({ ...f, advance: v }))}
              className="py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
            />
          )}
        </div>

        <div className="col-span-full flex items-center justify-between rounded-lg bg-panel-bg/60 border border-panel-border px-4 py-3 text-sm">
          <span className="text-slate-400">Saldo pendiente</span>
          <span className={`text-lg font-bold ${balance > 0 ? 'text-amber-400' : 'text-green-400'}`}>{pesos(balance)}</span>
        </div>

        <div>
          <label className="block text-sm mb-1 text-slate-300">Responsable *</label>
          <select
            required
            value={form.responsible}
            onChange={(e) => setForm({ ...form, responsible: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
          >
            <option value="">Elige quién lo atiende...</option>
            {opcionesResponsable(form.responsible).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
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
            {saving ? 'Guardando...' : order ? 'Guardar cambios' : 'Crear pedido'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
