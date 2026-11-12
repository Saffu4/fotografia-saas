import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import SesionFormModal from '../components/SesionFormModal'
import Modal from '../components/Modal'
import ComprobanteCitaModal from '../components/ComprobanteCitaModal'
import PedidoFormModal from '../components/PedidoFormModal'
import { categoriasPara, categoriaDe, fechaLocalInput } from '../lib/constantes'
import { enlaceWhatsApp, telefonoWhatsApp } from '../lib/utilidades'
import { avisar, confirmar } from '../components/Avisos'

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const EMPRESA = import.meta.env.VITE_COMPANY_NAME || 'el estudio'

const hora = (d) => new Date(d).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
const claveDia = (d) => fechaLocalInput(new Date(d))
const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const inicioSemana = (d) => sumarDias(d, -d.getDay())

// Recordatorios ya enviados (solo en este navegador, para no repetir).
function leerEnviados() {
  try { return JSON.parse(localStorage.getItem('recordatorios-enviados') || '{}') } catch { return {} }
}
function marcarEnviado(id) {
  try {
    const e = leerEnviados()
    e[id] = Date.now()
    localStorage.setItem('recordatorios-enviados', JSON.stringify(e))
  } catch { /* sin almacenamiento: no pasa nada */ }
}

export default function Agenda() {
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem('agenda-vista') || 'mes' } catch { return 'mes' }
  })
  const [cursor, setCursor] = useState(new Date())
  const [sessions, setSessions] = useState([])
  const [manana, setManana] = useState([])
  const [verRecordatorios, setVerRecordatorios] = useState(false)
  const [enviados, setEnviados] = useState(leerEnviados)
  const [formOpen, setFormOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null) // 'YYYY-MM-DD'
  const [editingSession, setEditingSession] = useState(null)
  const [comprobante, setComprobante] = useState(null)
  const [pedidoDesde, setPedidoDesde] = useState(null)

  useEffect(() => { try { localStorage.setItem('agenda-vista', vista) } catch { /* nada */ } }, [vista])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  // Rango que se ve en pantalla
  const [desde, hasta] = useMemo(() => {
    if (vista === 'semana') {
      const ini = inicioSemana(cursor)
      return [ini, sumarDias(ini, 7)]
    }
    return [new Date(year, month, 1), new Date(year, month + 1, 1)]
  }, [vista, cursor, year, month])

  async function loadSessions() {
    const { data } = await supabase
      .from('sessions')
      .select('*, clients(name, phone)')
      .gte('date', desde.toISOString())
      .lt('date', hasta.toISOString())
      .order('date')
    setSessions(data ?? [])
  }

  async function loadManana() {
    const hoy = new Date()
    const ini = sumarDias(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()), 1)
    const { data } = await supabase
      .from('sessions')
      .select('*, clients(name, phone)')
      .gte('date', ini.toISOString())
      .lt('date', sumarDias(ini, 1).toISOString())
      .order('date')
    setManana(data ?? [])
  }

  function recargar() { loadSessions(); loadManana() }

  useEffect(() => { loadSessions() }, [desde.getTime(), hasta.getTime()])
  useEffect(() => { loadManana() }, [])

  const porDia = useMemo(() => {
    const m = {}
    for (const s of sessions) (m[claveDia(s.date)] ??= []).push(s)
    return m
  }, [sessions])
  const citasDe = (clave) => (clave ? porDia[clave] ?? [] : [])

  const celdasMes = useMemo(() => {
    const offset = new Date(year, month, 1).getDay()
    const dias = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= dias; d++) cells.push(fechaLocalInput(new Date(year, month, d)))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  const diasSemana = useMemo(() => {
    const ini = inicioSemana(cursor)
    return Array.from({ length: 7 }, (_, i) => fechaLocalInput(sumarDias(ini, i)))
  }, [cursor])

  const hoyClave = fechaLocalInput(new Date())

  function mover(delta) {
    setCursor(vista === 'semana' ? sumarDias(cursor, 7 * delta) : new Date(year, month + delta, 1))
  }

  const titulo = vista === 'semana'
    ? (() => {
      const a = new Date(diasSemana[0] + 'T12:00'), b = new Date(diasSemana[6] + 'T12:00')
      return a.getMonth() === b.getMonth()
        ? `${a.getDate()}–${b.getDate()} ${MESES[a.getMonth()].slice(0, 3)} ${b.getFullYear()}`
        : `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)}`
    })()
    : `${MESES[month]} ${year}`

  function openNewSession(clave) {
    setPickedDate(clave)
    setEditingSession(null)
    setSelectedDate(null)
    setFormOpen(true)
  }

  function openEditSession(session) {
    setEditingSession(session)
    setSelectedDate(null)
    setFormOpen(true)
  }

  async function deleteSession(session) {
    const quien = session.clients?.name ? ` de ${session.clients.name}` : ''
    if (!(await confirmar(`¿Eliminar la cita${quien}? Esta acción no se puede deshacer.`, { peligro: true, aceptar: 'Eliminar' }))) return
    const { error } = await supabase.from('sessions').delete().eq('id', session.id)
    if (error) return avisar('Error: ' + error.message, 'error')
    avisar('Cita eliminada')
    recargar()
  }

  function crearPedido(s) {
    setSelectedDate(null)
    setPedidoDesde(s)
  }

  function mensajeRecordatorio(s) {
    const fecha = new Date(s.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    return `Hola ${s.clients?.name?.split(' ')[0] ?? ''}, te recordamos tu cita en ${EMPRESA} mañana ${fecha} a las ${hora(s.date)}${s.studio ? ` (${s.studio})` : ''}. ¡Te esperamos!`
  }

  const pendientesRecordar = manana.filter((s) => !enviados[s.id]).length

  const selectedLabel = selectedDate
    ? new Date(selectedDate + 'T12:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  // Tarjeta de una cita con todas sus acciones (se usa en el día y en la semana)
  const TarjetaCita = ({ s, compacta = false }) => (
    <div className="rounded-lg border border-panel-border bg-panel-bg px-3 py-3">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${categoriaDe(s.studio).dot}`} />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-100">{hora(s.date)}</div>
          <div className="text-slate-200 truncate">{s.clients?.name ?? 'Cliente sin asignar'}</div>
          {s.studio && <div className="text-xs text-slate-400">{s.studio}</div>}
          {s.notes && !compacta && <p className="mt-1 text-sm text-slate-400 whitespace-pre-wrap">{s.notes}</p>}
        </div>
      </div>
      <div className={`mt-3 grid gap-2 ${compacta ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <button onClick={() => setComprobante(s)} className="rounded-lg border border-panel-border px-2 py-2 text-xs text-slate-300 hover:border-panel-orange hover:text-white">Comprobante</button>
        <button onClick={() => openEditSession(s)} className="rounded-lg border border-panel-border px-2 py-2 text-xs text-slate-300 hover:border-panel-orange hover:text-white">Editar</button>
        <button onClick={() => crearPedido(s)} disabled={!s.client_id} title={s.client_id ? '' : 'La cita no tiene cliente'} className="rounded-lg border border-panel-border px-2 py-2 text-xs text-slate-300 hover:border-panel-orange hover:text-white disabled:opacity-40">+ Pedido</button>
        <button onClick={() => deleteSession(s)} className="rounded-lg border border-red-500/40 px-2 py-2 text-xs text-red-400 hover:bg-red-500/10">Eliminar</button>
      </div>
    </div>
  )

  return (
    <Layout title="Agenda" showStats={false}>
      {/* Recordatorios de mañana */}
      {manana.length > 0 && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/[0.06] p-4">
          <button onClick={() => setVerRecordatorios((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left">
            <span className="text-sm">
              <b>Mañana hay {manana.length} {manana.length === 1 ? 'cita' : 'citas'}.</b>{' '}
              <span className="text-slate-300">
                {pendientesRecordar ? `${pendientesRecordar} sin recordar por WhatsApp.` : 'Todas recordadas ✓'}
              </span>
            </span>
            <span className="shrink-0 text-xs text-green-400">{verRecordatorios ? 'Ocultar' : 'Recordar'}</span>
          </button>
          {verRecordatorios && (
            <ul className="mt-3 divide-y divide-green-500/20 text-sm">
              {manana.map((s) => (
                <li key={s.id} className="py-2 flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${categoriaDe(s.studio).dot}`} />
                  <span className="w-20 shrink-0 whitespace-nowrap text-slate-300">{hora(s.date)}</span>
                  <span className="min-w-0 flex-1 truncate">{s.clients?.name ?? 'Sin cliente'}</span>
                  {enviados[s.id] && <span className="text-xs text-green-400">✓ enviado</span>}
                  {telefonoWhatsApp(s.clients?.phone) ? (
                    <a
                      href={enlaceWhatsApp(s.clients.phone, mensajeRecordatorio(s))}
                      target="_blank" rel="noreferrer"
                      onClick={() => { marcarEnviado(s.id); setEnviados(leerEnviados()) }}
                      className="shrink-0 rounded-lg bg-green-600 hover:bg-green-500 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-500">sin celular</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-panel-card border border-panel-border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-panel-border p-0.5 text-sm">
              {[['mes', 'Mes'], ['semana', 'Semana']].map(([v, l]) => (
                <button
                  key={v} onClick={() => setVista(v)}
                  className={`px-3 py-1.5 rounded-md ${vista === v ? 'bg-panel-orange text-white font-medium' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button onClick={() => setCursor(new Date())} className="px-3 py-1.5 rounded-lg border border-panel-border text-sm hover:bg-white/5">Hoy</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => mover(-1)} aria-label="Anterior" className="h-9 w-9 shrink-0 rounded-lg border border-panel-border text-lg hover:bg-white/5">‹</button>
            <span className="font-medium flex-1 md:flex-none md:min-w-40 text-center">{titulo}</span>
            <button onClick={() => mover(1)} aria-label="Siguiente" className="h-9 w-9 shrink-0 rounded-lg border border-panel-border text-lg hover:bg-white/5">›</button>
            <button onClick={() => openNewSession(null)} className="hidden md:block ml-2 px-4 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600">
              + Agendar
            </button>
          </div>
          <button onClick={() => openNewSession(null)} className="md:hidden w-full px-4 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600">
            + Agendar cita
          </button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs text-slate-400">
          {categoriasPara('agenda').map((c) => (
            <span key={c.nombre} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />{c.nombre}
            </span>
          ))}
        </div>

        {vista === 'mes' ? (
          <>
            <div className="grid grid-cols-7 text-[11px] font-semibold tracking-wide text-slate-500 mb-2">
              {DIAS.map((d) => <div key={d} className="text-center py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {celdasMes.map((clave, i) => {
                const citas = citasDe(clave)
                const esHoy = clave === hoyClave
                return (
                  <div
                    key={i}
                    onClick={() => clave && setSelectedDate(clave)}
                    className={`min-h-[56px] sm:min-h-[112px] rounded-md sm:rounded-lg border p-1 sm:p-2 text-xs transition-colors ${
                      clave
                        ? esHoy
                          ? 'bg-panel-orange/[0.07] border-panel-orange/70 cursor-pointer'
                          : 'bg-panel-bg border-panel-border cursor-pointer hover:border-panel-orange/60'
                        : 'bg-transparent border-transparent'
                    }`}
                  >
                    {clave && (
                      <div className={`mb-1 sm:mb-2 flex h-6 w-6 items-center justify-center rounded-full ${esHoy ? 'bg-panel-orange text-white font-semibold' : 'text-slate-400'}`}>
                        {Number(clave.slice(8))}
                      </div>
                    )}
                    {citas.length > 0 && (
                      <div className="sm:hidden flex flex-wrap gap-0.5">
                        {citas.slice(0, 6).map((s) => <span key={s.id} className={`h-1.5 w-1.5 rounded-full ${categoriaDe(s.studio).dot}`} />)}
                        {citas.length > 6 && <span className="text-[9px] leading-none text-slate-400">+</span>}
                      </div>
                    )}
                    {citas.slice(0, 3).map((s) => (
                      <div key={s.id} title={s.studio || ''} className={`hidden sm:block mb-1 rounded-md border px-1.5 py-1 truncate ${categoriaDe(s.studio).chip}`}>
                        <span className="font-medium">{hora(s.date)}</span> {s.clients?.name ?? s.studio ?? 'Sesión'}
                      </div>
                    ))}
                    {citas.length > 3 && <div className="hidden sm:block mt-1 text-slate-400">+ {citas.length - 3} más</div>}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          // Vista semana: columnas en computador, días apilados en celular
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-2">
            {diasSemana.map((clave, i) => {
              const citas = citasDe(clave)
              const esHoy = clave === hoyClave
              const d = new Date(clave + 'T12:00')
              return (
                <div key={clave} className={`rounded-lg border p-2 ${esHoy ? 'border-panel-orange/70 bg-panel-orange/[0.05]' : 'border-panel-border bg-panel-bg'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">
                      {DIAS[i]} <span className={esHoy ? 'text-panel-orange' : 'text-slate-200'}>{d.getDate()}</span>
                    </span>
                    <button onClick={() => openNewSession(clave)} aria-label="Agendar este día" className="h-6 w-6 rounded-md text-slate-400 hover:bg-white/10 hover:text-white">+</button>
                  </div>
                  {citas.length === 0 && <div className="text-xs text-slate-600 md:py-4 md:text-center">Libre</div>}
                  <div className="space-y-1.5">
                    {citas.map((s) => (
                      <button
                        key={s.id} onClick={() => setSelectedDate(clave)}
                        className={`block w-full text-left rounded-md border px-2 py-1.5 text-xs ${categoriaDe(s.studio).chip}`}
                      >
                        <div className="font-semibold">{hora(s.date)}</div>
                        <div className="truncate">{s.clients?.name ?? 'Sin cliente'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedDate && (
        <Modal title={`Agenda del ${selectedLabel}`} wide onClose={() => setSelectedDate(null)}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm text-slate-400">
              {citasDe(selectedDate).length === 0
                ? 'No hay citas este día.'
                : `${citasDe(selectedDate).length} ${citasDe(selectedDate).length === 1 ? 'cita' : 'citas'}`}
            </p>
            <button onClick={() => openNewSession(selectedDate)} className="shrink-0 px-3 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600">
              + Agendar
            </button>
          </div>
          <div className="sm:max-h-[55vh] sm:overflow-y-auto space-y-2 sm:pr-1">
            {citasDe(selectedDate).map((s) => <TarjetaCita key={s.id} s={s} />)}
          </div>
        </Modal>
      )}

      {formOpen && (
        <SesionFormModal
          defaultDate={pickedDate}
          session={editingSession}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); recargar() }}
        />
      )}

      {pedidoDesde && (
        <PedidoFormModal
          inicial={{
            client_id: pedidoDesde.client_id,
            work_type: categoriasPara('pedidos').some((c) => c.nombre === categoriaDe(pedidoDesde.studio).nombre) ? categoriaDe(pedidoDesde.studio).nombre : '',
            observations: `Sesión del ${new Date(pedidoDesde.date).toLocaleDateString('es-CO')}${pedidoDesde.notes ? ` — ${pedidoDesde.notes}` : ''}`,
          }}
          onClose={() => setPedidoDesde(null)}
          onSaved={() => setPedidoDesde(null)}
        />
      )}

      {comprobante && <ComprobanteCitaModal session={comprobante} onClose={() => setComprobante(null)} />}
    </Layout>
  )
}
