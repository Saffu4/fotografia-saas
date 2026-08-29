import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import SesionFormModal from '../components/SesionFormModal'
import Modal from '../components/Modal'

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function Agenda() {
  const [cursor, setCursor] = useState(new Date())
  const [sessions, setSessions] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  async function loadSessions() {
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 1).toISOString()
    const { data } = await supabase
      .from('sessions')
      .select('*, clients(name)')
      .gte('date', start)
      .lt('date', end)
      .order('date')
    setSessions(data ?? [])
  }

  useEffect(() => { loadSessions() }, [year, month])

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay() // 0 = domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)

    const rows = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [year, month])

  function sessionsForDay(day) {
    if (!day) return []
    return sessions.filter((s) => new Date(s.date).getDate() === day)
  }

  function changeMonth(delta) {
    setCursor(new Date(year, month + delta, 1))
  }

  function openNewSession(day) {
    const iso = day
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null
    setPickedDate(iso)
    setFormOpen(true)
  }

  function openDay(day) {
    if (day) setSelectedDay(day)
  }

  const selectedSessions = sessionsForDay(selectedDay)
  const selectedDateLabel = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    : ''

  return (
    <Layout title="Panel de Administración" showStats={false}>
      <div className="bg-panel-card border border-panel-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-lg">Agenda de Sesiones</h2>
            <p className="text-sm text-slate-400">Programa sesiones para tus clientes</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => changeMonth(-1)} className="px-2 py-1 rounded-lg border border-panel-border hover:bg-white/5">‹</button>
            <span className="font-medium w-36 text-center">{MESES[month]} {year}</span>
            <button onClick={() => changeMonth(1)} className="px-2 py-1 rounded-lg border border-panel-border hover:bg-white/5">›</button>
            <button onClick={() => openNewSession(null)} className="ml-3 px-4 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600">
              + Agendar Sesión
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-xs text-slate-400 mb-2">
          {DIAS.map((d) => <div key={d} className="text-center py-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeks.flat().map((day, i) => (
            <div
              key={i}
              onClick={() => openDay(day)}
              className={`min-h-[90px] rounded-lg border border-panel-border p-2 text-xs ${
                day ? 'bg-panel-bg cursor-pointer hover:border-panel-orange/60' : 'bg-transparent border-transparent'
              }`}
            >
              {day && <div className="text-slate-400 mb-1">{day}</div>}
              {sessionsForDay(day).slice(0, 3).map((s) => (
                <div key={s.id} className="mb-1 px-1.5 py-0.5 rounded bg-panel-orange/15 text-panel-orange truncate">
                  {new Date(s.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} {s.clients?.name ?? s.studio}
                </div>
              ))}
              {sessionsForDay(day).length > 3 && (
                <div className="mt-1 text-slate-400">+ {sessionsForDay(day).length - 3} más</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedDay && (
        <Modal title={`Agenda del ${selectedDateLabel}`} wide onClose={() => setSelectedDay(null)}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm text-slate-400">
              {selectedSessions.length === 0
                ? 'No hay sesiones agendadas para este día.'
                : `${selectedSessions.length} ${selectedSessions.length === 1 ? 'sesión agendada' : 'sesiones agendadas'}`}
            </p>
            <button
              onClick={() => openNewSession(selectedDay)}
              className="shrink-0 px-3 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600"
            >
              + Agendar
            </button>
          </div>

          {selectedSessions.length > 0 && (
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {selectedSessions.map((s) => (
                <div key={s.id} className="rounded-lg border border-panel-border bg-panel-bg px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-panel-orange">
                        {new Date(s.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="mt-1 text-slate-200">{s.clients?.name ?? 'Cliente sin asignar'}</div>
                    </div>
                    {s.studio && <span className="text-sm text-slate-400">{s.studio}</span>}
                  </div>
                  {s.notes && <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {formOpen && (
        <SesionFormModal
          defaultDate={pickedDate}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); loadSessions() }}
        />
      )}
    </Layout>
  )
}
