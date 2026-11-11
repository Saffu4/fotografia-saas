import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import Modal from './Modal'
import { opcionesCategoria, nombreCanonico, fechaLocalInput, horaLocalInput } from '../lib/constantes'

function getSessionForm(session, defaultDate) {
  if (!session) {
    return {
      client_id: '',
      date: defaultDate ?? fechaLocalInput(new Date()),
      time: '09:00',
      studio: '',
      notes: '',
    }
  }

  // Ojo: hora LOCAL. Antes se usaba toISOString() (UTC) y al reagendar la
  // cita se corría 5 horas cada vez que se guardaba.
  const sessionDate = new Date(session.date)
  return {
    client_id: session.client_id ?? '',
    date: fechaLocalInput(sessionDate),
    time: horaLocalInput(sessionDate),
    studio: nombreCanonico(session.studio),
    notes: session.notes ?? '',
  }
}

export default function SesionFormModal({ defaultDate, session, onClose, onSaved, onDeleted }) {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => getSessionForm(session, defaultDate))

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      if (data) setClients(data)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const action = session ? 'modificar' : 'agendar'
    if (!window.confirm(`¿Confirmas ${action} esta sesión?`)) return

    setSaving(true)
    const iso = new Date(`${form.date}T${form.time}:00`).toISOString()
    const sessionData = {
      client_id: form.client_id || null,
      date: iso,
      studio: form.studio,
      notes: form.notes,
    }
    const { error } = session
      ? await supabase.from('sessions').update(sessionData).eq('id', session.id)
      : await supabase.from('sessions').insert({ ...sessionData, user_id: user.id })

    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    onSaved()
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.')) return
    setSaving(true)
    const { error } = await supabase.from('sessions').delete().eq('id', session.id)
    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    ;(onDeleted ?? onSaved)()
  }

  return (
    <Modal title={session ? 'Modificar Sesión' : 'Agendar Sesión'} onClose={onClose}>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

        <label className="block text-sm mb-1 text-slate-300">Estudio / Tipo *</label>
        <select
          required
          value={form.studio}
          onChange={(e) => setForm({ ...form, studio: e.target.value })}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
        >
          <option value="">Selecciona...</option>
          {opcionesCategoria(form.studio).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="block text-sm mb-1 text-slate-300">Notas</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full mb-6 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border"
        />

        <div className="flex justify-end gap-3">
          {session && (
            <button
              type="button" onClick={handleDelete} disabled={saving}
              className="mr-auto px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              Eliminar
            </button>
          )}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-panel-border text-slate-300 hover:bg-white/5">
            Cancelar
          </button>
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'Guardando...' : session ? 'Guardar cambios' : 'Agendar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
