import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import Modal from './Modal'

export default function SesionFormModal({ defaultDate, onClose, onSaved }) {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    date: defaultDate ?? new Date().toISOString().slice(0, 10),
    time: '09:00',
    studio: '',
    notes: '',
  })

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      if (data) setClients(data)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const iso = new Date(`${form.date}T${form.time}:00`).toISOString()
    const { error } = await supabase.from('sessions').insert({
      user_id: user.id,
      client_id: form.client_id || null,
      date: iso,
      studio: form.studio,
      notes: form.notes,
    })
    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    onSaved()
  }

  return (
    <Modal title="Agendar Sesión" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="block text-sm mb-1 text-slate-300">Cliente</label>
        <select
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
        >
          <option value="">Sin asignar</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-1 text-slate-300">Fecha *</label>
            <input
              type="date" required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-300">Hora *</label>
            <input
              type="time" required
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
            />
          </div>
        </div>

        <label className="block text-sm mb-1 text-slate-300">Estudio / Tipo</label>
        <input
          value={form.studio}
          onChange={(e) => setForm({ ...form, studio: e.target.value })}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
        />

        <label className="block text-sm mb-1 text-slate-300">Notas</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full mb-6 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
        />

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-panel-border text-slate-300 hover:bg-white/5">
            Cancelar
          </button>
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Agendar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
