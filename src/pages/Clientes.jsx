import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import Layout from '../components/Layout'
import Modal from '../components/Modal'

const emptyForm = { name: '', phone: '', address: '' }
const PAGE_SIZE = 10

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

  async function loadClients() {
    setLoading(true)
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,address.ilike.%${search}%`)
    }
    const { data, error, count } = await query
    if (!error) {
      setClients(data ?? [])
      setTotalClients(count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [search, page, refreshKey])

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
    setSaving(true)

    if (editing) {
      const { error } = await supabase
        .from('clients')
        .update({ name: form.name, phone: form.phone, address: form.address })
        .eq('id', editing.id)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase
        .from('clients')
        .insert({ ...form, user_id: user.id })
      if (error) alert('Error al crear: ' + error.message)
    }

    setSaving(false)
    setModalOpen(false)
    loadClients()
    setRefreshKey((k) => k + 1)
  }

  async function handleDelete(client) {
    if (!confirm(`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('clients').delete().eq('id', client.id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
      return
    }
    loadClients()
    setRefreshKey((k) => k + 1)
  }

  return (
    <Layout title="Panel de Administración" refreshKey={refreshKey}>
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
                <td className="py-3 font-medium">{c.name}</td>
                <td className="py-3 text-slate-300">{c.phone || '—'}</td>
                <td className="py-3 text-slate-300">{c.address || '—'}</td>
                <td className="py-3 text-right">
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
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
            />

            <label className="block text-sm mb-1 text-slate-300">Dirección *</label>
            <input
              required
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
    </Layout>
  )
}
