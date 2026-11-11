import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import SesionFormModal from '../components/SesionFormModal'
import Modal from '../components/Modal'
import ComprobanteCitaModal from '../components/ComprobanteCitaModal'
import { CATEGORIAS, categoriaDe } from '../lib/constantes'

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
  const [editingSession, setEditingSession] = useState(null)
  const [comprobante, setComprobante] = useState(null)

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
    setEditingSession(null)
    setSelectedDay(null)
    setFormOpen(true)
  }

  function openEditSession(session) {
    setEditingSession(session)
    setSelectedDay(null)
    setFormOpen(true)
  }

  async function deleteSession(session) {
    const quien = session.clients?.name ? ` de ${session.clients.name}` : ''
    if (!window.confirm(`¿Eliminar la cita${quien}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('sessions').delete().eq('id', session.id)
    if (error) return alert('Error: ' + error.message)
    loadSessions()
  }

  function openDay(day) {
    if (day) setSelectedDay(day)
  }

  function isToday(day) {
    const today = new Date()
    return day && day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const selectedSessions = sessionsForDay(selectedDay)
  const selectedDateLabel = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    : ''

  return (
    <Layout title="Panel de Administración" showStats={false}>
      <div className="bg-panel-card border border-panel-border rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-panel-orange" />
              <h2 className="font-semibold text-lg">Agenda de Sesiones</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">Organiza citas, estudios y reagendaciones</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setCursor(new Date())} className="px-3 py-2 rounded-lg border border-panel-border text-sm hover:bg-white/5">Hoy</button>
            <button onClick={() => changeMonth(-1)} aria-label="Mes anterior" className="h-9 w-9 rounded-lg border border-panel-border text-lg hover:bg-white/5">‹</button>
            <span className="font-medium flex-1 sm:flex-none sm:min-w-32 text-center">{MESES[month]} {year}</span>
            <button onClick={() => changeMonth(1)} aria-label="Mes siguiente" className="h-9 w-9 rounded-lg border border-panel-border text-lg hover:bg-white/5">›</button>
            <button onClick={() => openNewSession(null)} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600">
              + Agendar Sesión
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs text-slate-400">
          {CATEGORIAS.map((c) => (
            <span key={c.nombre} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />{c.nombre}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 text-[11px] font-semibold tracking-wide text-slate-500 mb-2">
          {DIAS.map((d) => <div key={d} className="text-center py-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weeks.flat().map((day, i) => (
            <div
              key={i}
              onClick={() => openDay(day)}
              className={`min-h-[56px] sm:min-h-[112px] rounded-md sm:rounded-lg border p-1 sm:p-2 text-xs transition-colors ${
                day
                  ? isToday(day)
                    ? 'bg-panel-orange/[0.07] border-panel-orange/70 cursor-pointer'
                    : 'bg-panel-bg border-panel-border cursor-pointer hover:border-panel-orange/60'
                  : 'bg-transparent border-transparent'
              }`}
            >
              {day && (
                <div className={`mb-1 sm:mb-2 flex h-6 w-6 items-center justify-center rounded-full ${isToday(day) ? 'bg-panel-orange text-white font-semibold' : 'text-slate-400'}`}>
                  {day}
                </div>
              )}
              {/* Celular: puntos de color por cita */}
              {sessionsForDay(day).length > 0 && (
                <div className="sm:hidden flex flex-wrap gap-0.5">
                  {sessionsForDay(day).slice(0, 6).map((s) => (
                    <span key={s.id} className={`h-1.5 w-1.5 rounded-full ${categoriaDe(s.studio).dot}`} />
                  ))}
                  {sessionsForDay(day).length > 6 && <span className="text-[9px] leading-none text-slate-400">+</span>}
                </div>
              )}
              {/* Computador: chips con hora y nombre */}
              {sessionsForDay(day).slice(0, 3).map((s) => (
                <div key={s.id} title={s.studio || ''} className={`hidden sm:block mb-1 rounded-md border px-1.5 py-1 truncate ${categoriaDe(s.studio).chip}`}>
                  <span className="font-medium">{new Date(s.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>{' '}
                  {s.clients?.name ?? s.studio ?? 'Sesión'}
                </div>
              ))}
              {sessionsForDay(day).length > 3 && (
                <div className="hidden sm:block mt-1 text-slate-400">+ {sessionsForDay(day).length - 3} más</div>
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
            <div className="sm:max-h-[50vh] sm:overflow-y-auto space-y-2 sm:pr-1">
              {selectedSessions.map((s) => (
                <div key={s.id} className="rounded-lg border border-panel-border bg-panel-bg px-3 sm:px-4 py-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex gap-3">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${categoriaDe(s.studio).dot}`} />
                      <div>
                        <div className="font-medium text-slate-100">
                          {new Date(s.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="mt-1 text-slate-200">{s.clients?.name ?? 'Cliente sin asignar'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex">
                      <button
                        onClick={() => setComprobante(s)}
                        className="rounded-lg border border-panel-border px-2 sm:px-3 py-2 sm:py-1.5 text-xs text-slate-300 hover:border-panel-orange hover:text-white"
                      >
                        <span className="hidden sm:inline">📲 </span>Comprobante
                      </button>
                      <button
                        onClick={() => openEditSession(s)}
                        className="rounded-lg border border-panel-border px-2 sm:px-3 py-2 sm:py-1.5 text-xs text-slate-300 hover:border-panel-orange hover:text-white"
                      >
                        <span className="sm:hidden">Editar</span><span className="hidden sm:inline">Editar / reagendar</span>
                      </button>
                      <button
                        onClick={() => deleteSession(s)}
                        title="Eliminar cita"
                        className="rounded-lg border border-red-500/40 px-2 sm:px-3 py-2 sm:py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {s.studio && (
                    <div className="mt-2">
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${categoriaDe(s.studio).chip}`}>{s.studio}</span>
                    </div>
                  )}
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
          session={editingSession}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); loadSessions() }}
        />
      )}

      {comprobante && (
        <ComprobanteCitaModal session={comprobante} onClose={() => setComprobante(null)} />
      )}
    </Layout>
  )
}
