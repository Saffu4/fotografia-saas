import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import { ESTADOS_PEDIDO, categoriaDe } from '../lib/constantes'
import { recalcularSaldo } from '../lib/pedidos'
const TABS = ['Detalles Generales', 'Abonos / Pagos', 'Observaciones']

export default function PedidoDetalleModal({ orderId, onClose, onChanged }) {
  const [tab, setTab] = useState(TABS[0])
  const [order, setOrder] = useState(null)
  const [client, setClient] = useState(null)
  const [payments, setPayments] = useState([])
  const [notes, setNotes] = useState([])
  const [status, setStatus] = useState('')
  const [newPayment, setNewPayment] = useState('')
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).single()
    setOrder(o)
    setStatus(o?.status ?? '')

    if (o?.client_id) {
      const { data: c } = await supabase.from('clients').select('*').eq('id', o.client_id).single()
      setClient(c)
    }

    const { data: p } = await supabase
      .from('payments').select('*').eq('order_id', orderId).order('payment_date', { ascending: false })
    setPayments(p ?? [])

    const { data: n } = await supabase
      .from('order_observations').select('*').eq('order_id', orderId).order('created_at', { ascending: false })
    setNotes(n ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [orderId])

  async function handleUpdateStatus() {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) return alert('Error: ' + error.message)
    await loadAll()
    onChanged()
  }

  async function handleAddPayment(e) {
    e.preventDefault()
    const amount = Number(newPayment)
    if (!amount || amount <= 0) return
    const { error } = await supabase.from('payments').insert({
      order_id: orderId, amount,
    })
    if (error) return alert('Error: ' + error.message)
    const { error: errSaldo } = await recalcularSaldo(orderId)
    if (errSaldo) alert('El abono se guardó, pero no se pudo actualizar el saldo: ' + errSaldo.message)
    setNewPayment('')
    await loadAll()
    onChanged()
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    const { error } = await supabase.from('order_observations').insert({
      order_id: orderId, content: newNote.trim(),
    })
    if (error) return alert('Error: ' + error.message)
    setNewNote('')
    await loadAll()
  }

  function handlePrint() {
    // El logo vive en /public/logo.png. Usamos la URL absoluta porque la
    // ventana de impresión es un documento nuevo y en blanco: una ruta
    // relativa como "logo.png" no resolvería a nada.
    const logoUrl = `${window.location.origin}/logo.jpg`
    const companyName = import.meta.env.VITE_COMPANY_NAME || 'Mi Empresa'

    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Recibo de Pedido #${order.order_number}</title>
      <style>
        @page{size:80mm auto; margin:8mm 5mm}
        *{box-sizing:border-box}
        body{font-family:Arial,sans-serif; width:70mm; margin:0 auto; color:#111; font-size:12px; line-height:1.4}
        .header{text-align:center; padding-bottom:12px; border-bottom:1px dashed #999}
        .header img{display:block; width:52mm; height:30mm; margin:0 auto 9px; object-fit:contain}
        .header .company{font-weight:bold; font-size:16px; letter-spacing:.3px}
        h2{margin:3px 0; font-size:15px; letter-spacing:1.4px}
        .muted{color:#555; font-size:11px}
        table{width:100%; border-collapse:collapse; margin-top:12px}
        tr{display:block; padding:5px 0; border-bottom:1px dotted #ccc}
        td{display:block; padding:0; vertical-align:top}
        td.label{color:#666; width:auto; font-size:10px; text-transform:uppercase; letter-spacing:.5px}
        td:not(.label){font-weight:600; font-size:13px; overflow-wrap:anywhere}
        .total{display:flex; justify-content:space-between; align-items:end; border-top:2px solid #111; border-bottom:0; margin-top:5px; padding:10px 0 0; font-weight:bold; font-size:14px}
        .total td{display:block}
        .total td.label{color:#111; font-size:11px}
        .total td:not(.label){font-size:16px}
        .descripcion{margin-top:14px; padding:9px 0; border-top:1px dashed #999; border-bottom:1px dashed #999; white-space:pre-wrap; overflow-wrap:anywhere}
        .descripcion strong{display:block; margin-bottom:4px; font-size:10px; text-transform:uppercase; letter-spacing:.5px}
      </style></head><body>
      <div class="header">
        <img src="${logoUrl}" onerror="this.style.display='none'" />
        <div>
          <div class="company">${companyName}</div>
          <h2>RECIBO DE CAJA</h2>
          <div class="muted">Pedido #${order.order_number} — ${order.date}</div>
        </div>
      </div>
      <table>
        <tr><td class="label">Cliente</td><td>${client?.name ?? '—'}</td></tr>
        <tr><td class="label">Teléfono</td><td>${client?.phone ?? '—'}</td></tr>
        <tr><td class="label">Tipo de trabajo</td><td>${order.work_type ?? '—'}</td></tr>
        <tr><td class="label">Responsable</td><td>${order.responsible ?? '—'}</td></tr>
        <tr><td class="label">Total</td><td>$${Number(order.total).toLocaleString('es-CO')}</td></tr>
        <tr><td class="label">Abonado</td><td>$${Number(order.advance).toLocaleString('es-CO')}</td></tr>
        <tr class="total"><td class="label">Saldo Pendiente</td><td>$${Number(order.balance).toLocaleString('es-CO')}</td></tr>
      </table>
      ${order.observations ? `
        <div class="descripcion">
          <strong>Descripción del trabajo:</strong><br/>
          ${order.observations.replace(/</g, '&lt;')}
        </div>
      ` : ''}
      </body></html>
    `)
    win.document.close()
    win.onload = () => win.print()
  }

  if (loading || !order) {
    return (
      <Modal title="Detalles del Pedido" onClose={onClose} wide>
        <div className="text-center text-slate-400 py-10">Cargando...</div>
      </Modal>
    )
  }

  return (
    <Modal title={`Detalles del Pedido #${order.order_number} — ${client?.name ?? ''}`} onClose={onClose} wide>
      <div className="flex justify-end -mt-2 mb-3">
        <button onClick={handlePrint} className="text-sm px-3 py-1.5 rounded-lg border border-panel-border text-slate-300 hover:bg-white/5">
          🖨️ Imprimir
        </button>
      </div>

      <div className="flex gap-2 mb-5 border-b border-panel-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? 'border-panel-orange text-panel-orange' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Detalles Generales' && (
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <div>
              <div className="text-slate-400">Información del Cliente</div>
              <div className="font-medium">{client?.name ?? '—'}</div>
              <div className="text-slate-300">{client?.phone ?? '—'}</div>
            </div>
            <div>
              <div className="text-slate-400 mt-3">Detalles del Trabajo</div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${categoriaDe(order.work_type).dot}`} />
                {order.work_type || '—'} &middot; {order.date}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mt-3">Responsable</div>
              <div>{order.responsible ?? '—'}</div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1">Estado Actual</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
              >
                {ESTADOS_PEDIDO.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={handleUpdateStatus} className="mt-2 w-full py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600">
                Actualizar Estado
              </button>
            </div>
            <div className="pt-2 space-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Total</span><span className="font-bold">${Number(order.total).toLocaleString('es-CO')}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Abonado</span><span>${Number(order.advance).toLocaleString('es-CO')}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Saldo Pendiente</span><span className="font-bold">${Number(order.balance).toLocaleString('es-CO')}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Abonos / Pagos' && (
        <div>
          <form onSubmit={handleAddPayment} className="flex gap-2 mb-4">
            <input
              type="number" min="0" placeholder="Monto del abono"
              value={newPayment}
              onChange={(e) => setNewPayment(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
            />
            <button className="px-4 py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600">Registrar</button>
          </form>
          <ul className="divide-y divide-panel-border/60 text-sm">
            {payments.length === 0 && <li className="py-3 text-slate-500">Sin abonos registrados.</li>}
            {payments.map((p) => (
              <li key={p.id} className="py-2 flex justify-between">
                <span>{new Date(p.payment_date).toLocaleDateString('es-CO')}</span>
                <span className="font-medium">${Number(p.amount).toLocaleString('es-CO')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'Observaciones' && (
        <div>
          {order.observations && (
            <div className="mb-4 p-3 rounded-lg bg-panel-bg border border-panel-border text-sm">
              <div className="text-slate-400 mb-1">Observaciones originales</div>
              {order.observations}
            </div>
          )}
          <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
            <input
              placeholder="Agregar una nota..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
            />
            <button className="px-4 py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600">Agregar</button>
          </form>
          <ul className="divide-y divide-panel-border/60 text-sm">
            {notes.length === 0 && <li className="py-3 text-slate-500">Sin notas adicionales.</li>}
            {notes.map((n) => (
              <li key={n.id} className="py-2">
                <div className="text-slate-400 text-xs">{new Date(n.created_at).toLocaleString('es-CO')}</div>
                {n.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
