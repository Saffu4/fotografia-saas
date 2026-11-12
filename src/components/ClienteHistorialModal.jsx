import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import { ESTADO_BADGE, categoriaDe } from '../lib/constantes'
import { pesos, enlaceWhatsApp } from '../lib/utilidades'

// Ficha del cliente: sus pedidos, saldos y citas en un solo lugar.
export default function ClienteHistorialModal({ client, onClose }) {
  const [orders, setOrders] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('orders')
        .select('id, order_number, date, work_type, total, advance, balance, status')
        .eq('client_id', client.id).order('date', { ascending: false }),
      supabase.from('sessions')
        .select('id, date, studio, notes')
        .eq('client_id', client.id).order('date', { ascending: false }),
    ]).then(([o, s]) => {
      setOrders(o.data ?? [])
      setSessions(s.data ?? [])
      setLoading(false)
    })
  }, [client.id])

  const activos = orders.filter((o) => o.status !== 'Cancelado')
  const total = activos.reduce((s, o) => s + Number(o.total || 0), 0)
  const abonado = activos.reduce((s, o) => s + Number(o.advance || 0), 0)
  const saldo = activos.reduce((s, o) => s + Number(o.balance || 0), 0)
  const ahora = new Date()
  const proximas = sessions.filter((s) => new Date(s.date) >= ahora).reverse()
  const pasadas = sessions.filter((s) => new Date(s.date) < ahora)

  const fechaHora = (d) => new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <Modal title={client.name} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-5">
        {client.phone && <a href={`tel:${client.phone}`} className="text-slate-300">📞 {client.phone}</a>}
        {client.phone && (
          <a href={enlaceWhatsApp(client.phone, `Hola ${client.name}, `)} target="_blank" rel="noreferrer" className="text-green-400 hover:underline">
            WhatsApp
          </a>
        )}
        {client.address && <span className="text-slate-400">{client.address}</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        {[['Comprado', total], ['Abonado', abonado], ['Saldo', saldo]].map(([label, v]) => (
          <div key={label} className="rounded-lg bg-panel-bg border border-panel-border p-3">
            <div className="text-xs text-slate-400">{label}</div>
            <div className={`font-semibold ${label === 'Saldo' && v > 0 ? 'text-amber-400' : ''}`}>{pesos(v)}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-500 text-sm">Cargando...</div>
      ) : (
        <>
          <h4 className="text-sm font-semibold mb-2">Pedidos ({orders.length})</h4>
          <ul className="divide-y divide-panel-border/60 text-sm mb-6">
            {orders.length === 0 && <li className="py-2 text-slate-500">Sin pedidos.</li>}
            {orders.map((o) => (
              <li key={o.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">#{o.order_number}</span>
                <span className="text-slate-400">{o.date}</span>
                {o.work_type && <span className={`px-2 py-0.5 rounded-full border text-xs ${categoriaDe(o.work_type).chip}`}>{o.work_type}</span>}
                <span className={`px-2 py-0.5 rounded-full text-xs ${ESTADO_BADGE[o.status] ?? 'bg-slate-500/15 text-slate-300'}`}>{o.status}</span>
                <span className="ml-auto text-right">
                  {pesos(o.total)}
                  {Number(o.balance) > 0 && <span className="text-amber-400"> · debe {pesos(o.balance)}</span>}
                </span>
              </li>
            ))}
          </ul>

          <h4 className="text-sm font-semibold mb-2">Citas</h4>
          <ul className="divide-y divide-panel-border/60 text-sm">
            {sessions.length === 0 && <li className="py-2 text-slate-500">Sin citas.</li>}
            {[...proximas.map((s) => [s, true]), ...pasadas.map((s) => [s, false])].map(([s, futura]) => (
              <li key={s.id} className={`py-2 flex items-center gap-3 ${futura ? '' : 'text-slate-400'}`}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${categoriaDe(s.studio).dot}`} />
                <span>{fechaHora(s.date)}</span>
                <span className="text-slate-400">{s.studio}</span>
                {futura && <span className="ml-auto text-xs text-green-400">Próxima</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  )
}
