import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import PedidoFormModal from '../components/PedidoFormModal'
import PedidoDetalleModal from '../components/PedidoDetalleModal'
import { ESTADOS_PEDIDO, ESTADO_BADGE as badgeColor, categoriaDe } from '../lib/constantes'
const PAGE_SIZE = 10

export default function Pedidos() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos los Estados')
  const [formOpen, setFormOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)

  async function loadOrders() {
    setLoading(true)
    const searchTerm = search.trim()
    let matchingClientIds = []

    if (searchTerm) {
      const { data: matchingClients } = await supabase
        .from('clients')
        .select('id')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)

      matchingClientIds = (matchingClients ?? []).map((client) => client.id)
    }

    let query = supabase
      .from('orders')
      .select('*, clients(name, phone)', { count: 'exact' })
      .order('date', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (statusFilter !== 'Todos los Estados') query = query.eq('status', statusFilter)
    if (searchTerm) {
      const searchFilters = [`order_number.ilike.%${searchTerm}%`, `responsible.ilike.%${searchTerm}%`]
      if (matchingClientIds.length) searchFilters.push(`client_id.in.(${matchingClientIds.join(',')})`)
      query = query.or(searchFilters.join(','))
    }

    const { data, error, count } = await query
    if (!error) {
      setOrders(data ?? [])
      setTotalOrders(count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [search, statusFilter, refreshKey, page])

  function openNew() {
    setEditingOrder(null)
    setFormOpen(true)
  }

  function openEdit(order) {
    setEditingOrder(order)
    setFormOpen(true)
  }

  async function handleDelete(order) {
    if (!confirm(`¿Eliminar el pedido #${order.order_number}?`)) return
    const { error } = await supabase.from('orders').delete().eq('id', order.id)
    if (error) return alert('Error: ' + error.message)
    setRefreshKey((k) => k + 1)
  }

  return (
    <Layout title="Panel de Administración" refreshKey={refreshKey}>
      <div className="bg-panel-card border border-panel-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="font-semibold text-lg">Gestión de Pedidos</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              placeholder="Buscar #, cliente, tel..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-sm outline-none focus:border-panel-orange w-56"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-sm"
            >
              <option>Todos los Estados</option>
              {ESTADOS_PEDIDO.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button
              onClick={openNew}
              className="px-4 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600"
            >
              + Agregar
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-panel-border">
              <th className="py-2 font-medium">Pedido #</th>
              <th className="py-2 font-medium">Cliente / Tel</th>
              <th className="py-2 font-medium">Tipo</th>
              <th className="py-2 font-medium">Fecha</th>
              <th className="py-2 font-medium">Total</th>
              <th className="py-2 font-medium">Saldo</th>
              <th className="py-2 font-medium">Estado</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="py-6 text-center text-slate-500">Cargando...</td></tr>}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-slate-500">No hay pedidos todavía.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-panel-border/60 hover:bg-white/[0.03]">
                <td className="py-3 font-medium">{o.order_number}</td>
                <td className="py-3">
                  <div className="font-medium">{o.clients?.name ?? '—'}</div>
                  <div className="text-slate-400 text-xs">{o.clients?.phone}</div>
                </td>
                <td className="py-3">
                  {o.work_type ? (
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${categoriaDe(o.work_type).chip}`}>{o.work_type}</span>
                  ) : '—'}
                </td>
                <td className="py-3 text-slate-300">{o.date}</td>
                <td className="py-3">${Number(o.total).toLocaleString('es-CO')}</td>
                <td className="py-3">${Number(o.balance).toLocaleString('es-CO')}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColor[o.status] ?? 'bg-slate-500/15 text-slate-300'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <button onClick={() => setDetailId(o.id)} className="mr-3" title="Ver">👁️</button>
                  <button onClick={() => openEdit(o)} className="mr-3" title="Editar">✏️</button>
                  <button onClick={() => handleDelete(o)} title="Eliminar">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalOrders > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-slate-400">
              Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalOrders)} de {totalOrders}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
                className="px-3 py-1.5 rounded-lg border border-panel-border hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-slate-400">Página {page} de {Math.ceil(totalOrders / PAGE_SIZE)}</span>
              <button
                disabled={page >= Math.ceil(totalOrders / PAGE_SIZE)}
                onClick={() => setPage((current) => current + 1)}
                className="px-3 py-1.5 rounded-lg border border-panel-border hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <PedidoFormModal
          order={editingOrder}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); setRefreshKey((k) => k + 1) }}
        />
      )}

      {detailId && (
        <PedidoDetalleModal
          orderId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </Layout>
  )
}
