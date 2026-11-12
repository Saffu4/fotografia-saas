import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ClienteHistorialModal from '../components/ClienteHistorialModal'
import { limpiarBusqueda, useDebounce } from '../lib/utilidades'
import { buscarClientes } from '../lib/datos'
import { avisar, confirmar } from '../components/Avisos'

const emptyForm = { name: '', phone: '', address: '' }
const PAGE_SIZE = 10

async function buscarDuplicado({ name, phone }, excluirId) {
  const base = () => {
    let q = supabase.from('clients').select('id, name, phone').limit(1)
    if (excluirId) q = q.neq('id', excluirId)
    return q
  }
  const [porTel, porNombre] = await Promise.all([
    phone ? base().eq('phone', phone) : Promise.resolve({ data: [] }),
    name ? base().ilike('name', name.replace(/[%_\\]/g, '')) : Promise.resolve({ data: [] }),
  ])
  return porTel.data?.[0] ?? porNombre.data?.[0] ?? null
}

export default function Clientes() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // client being edited, or null for "new"
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [totalClients, setTotalClients] = useState(0)
  const [historial, setHistorial] = useState(null)
  const busqueda = useDebounce(limpiarBusqueda(search), 300)

  async function loadClients(vigente = { ok: true }) {
    setLoading(true)
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    if (busqueda) {
      const ids = (await buscarClientes(busqueda, 500, 'id')).map((c) => c.id)
      query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    }
    const { data, error, count } = await query
    if (!vigente.ok) return
    if (!error) {
      setClients(data ?? [])
      setTotalClients(count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    const vigente = { ok: true }
    loadClients(vigente)
    return () => { vigente.ok = false }
  }, [busqueda, page, refreshKey])

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(client) {
    setEditing(client)
    setForm({ name: client.name, phone: client.phone ?? '', address: client.address ?? '' })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    const datos = { name: form.name.trim().replace(/\s+/g, ' '), phone: form.phone.replace(/\D/g, ''), address: form.address.trim() }
    if (datos.phone && datos.phone.length !== 10) {
      return avisar('El teléfono debe tener 10 dígitos (ej. 3001234567).', 'error')
    }

    // Aviso de cliente repetido (mismo teléfono o mismo nombre).
    const duplicado = await buscarDuplicado(datos, editing?.id)
    if (duplicado && !(await confirmar(
      `Ya existe ${duplicado.name}${duplicado.phone ? ` (${duplicado.phone})` : ''}.\n¿Guardar de todas formas como otro cliente?`,
      { titulo: 'Cliente repetido', aceptar: 'Guardar igual' }
    ))) return

    setSaving(true)

    const { error } = editing
      ? await supabase.from('clients').update(datos).eq('id', editing.id)
      : await supabase.from('clients').insert({ ...datos, user_id: user.id })

    setSaving(false)
    // Si falla, el formulario queda abierto para no perder lo escrito.
    if (error) return avisar((editing ? 'Error al actualizar: ' : 'Error al crear: ') + error.message, 'error')
    setModalOpen(false)
    avisar(editing ? 'Cliente actualizado' : 'Cliente creado')
    setRefreshKey((k) => k + 1)
  }

  async function handleDelete(client) {
    const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('client_id', client.id)
    const aviso = count
      ? `${client.name} tiene ${count} pedido(s). Si lo eliminas, esos pedidos quedan sin cliente.\n\n¿Eliminar de todas formas?`
      : `¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`
    if (!(await confirmar(aviso, { titulo: 'Eliminar cliente', aceptar: 'Eliminar', peligro: true }))) return
    const { error } = await supabase.from('clients').delete().eq('id', client.id)
    if (error) return avisar('Error al eliminar: ' + error.message, 'error')
    avisar('Cliente eliminado')
    setRefreshKey((k) => k + 1)
  }

  return (
    <Layout title="Clientes" refreshKey={refreshKey}>
      <div className="bg-panel-card border border-panel-border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-lg">Gestión de Clientes</h2>
          <div className="flex gap-2 sm:gap-3">
            <input
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-sm outline-none focus:border-panel-orange flex-1 min-w-0 sm:flex-none sm:w-56"
            />
            <button
              onClick={openNew}
              className="shrink-0 px-4 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600"
            >
              + Agregar<span className="hidden sm:inline"> Cliente</span>
            </button>
          </div>
        </div>

        {/* Celular: tarjetas */}
        <div className="md:hidden divide-y divide-panel-border/60">
          {loading && <div className="py-6 text-center text-slate-500 text-sm">Cargando...</div>}
          {!loading && clients.length === 0 && <div className="py-6 text-center text-slate-500 text-sm">No hay clientes todavía.</div>}
          {clients.map((c) => (
            <div key={c.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm">
                <div className="font-medium">{c.name}</div>
                {c.phone && <a href={`tel:${c.phone}`} className="text-slate-300 block">{c.phone}</a>}
                {c.address && <div className="text-slate-400 text-xs truncate">{c.address}</div>}
              </div>
              <div className="flex shrink-0">
                <button onClick={() => setHistorial(c)} className="h-10 w-10 rounded-lg hover:bg-white/5" title="Ver historial">👁️</button>
                <button onClick={() => openEdit(c)} className="h-10 w-10 rounded-lg hover:bg-white/5" title="Editar">✏️</button>
                <button onClick={() => handleDelete(c)} className="h-10 w-10 rounded-lg hover:bg-white/5" title="Eliminar">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {/* Computador: tabla */}
        <table className="hidden md:table w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-panel-border">
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium">Teléfono</th>
              <th className="py-2 font-medium">Dirección</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="py-6 text-center text-slate-500">Cargando...</td></tr>
            )}
            {!loading && clients.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-slate-500">No hay clientes todavía.</td></tr>
            )}
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-panel-border/60 hover:bg-white/[0.03]">
                <td className="py-3 font-medium">
                  <button onClick={() => setHistorial(c)} className="hover:text-panel-orange text-left">{c.name}</button>
                </td>
                <td className="py-3 text-slate-300">{c.phone || '—'}</td>
                <td className="py-3 text-slate-300">{c.address || '—'}</td>
                <td className="py-3 text-right whitespace-nowrap">
                  <button onClick={() => setHistorial(c)} className="mr-3" title="Ver historial">👁️</button>
                  <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-300 mr-3" title="Editar">✏️</button>
                  <button onClick={() => handleDelete(c)} className="text-red-400 hover:text-red-300" title="Eliminar">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalClients > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 text-sm">
            <span className="text-slate-400">
              Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalClients)} de {totalClients}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
                className="px-3 py-1.5 rounded-lg border border-panel-border hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-slate-400">Página {page} de {Math.ceil(totalClients / PAGE_SIZE)}</span>
              <button
                disabled={page >= Math.ceil(totalClients / PAGE_SIZE)}
                onClick={() => setPage((current) => current + 1)}
                className="px-3 py-1.5 rounded-lg border border-panel-border hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar Cliente' : 'Agregar Nuevo Cliente'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave}>
            <label className="block text-sm mb-1 text-slate-300">Nombre *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
            />

            <label className="block text-sm mb-1 text-slate-300">Teléfono *</label>
            <input
              required
              type="tel" inputMode="numeric" placeholder="3001234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s+-]/g, '') })}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
            />

            <label className="block text-sm mb-1 text-slate-300">Dirección <span className="text-slate-500">(opcional)</span></label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full mb-6 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
            />

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-panel-border text-slate-300 hover:bg-white/5">
                Cancelar
              </button>
              <button disabled={saving} className="px-4 py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600 disabled:opacity-50">
                {saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {historial && <ClienteHistorialModal client={historial} onClose={() => setHistorial(null)} />}
    </Layout>
  )
}
