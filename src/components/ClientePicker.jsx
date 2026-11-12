import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { limpiarBusqueda, useDebounce } from '../lib/utilidades'
import { buscarClientes } from '../lib/datos'
import { avisar, confirmar } from './Avisos'

// Buscador de clientes: busca en la base mientras se escribe (no carga todos
// los clientes de una vez) y permite crear uno nuevo sin salir del formulario.
export default function ClientePicker({ value, onChange, required = false }) {
  const { user } = useAuth()
  const [seleccionado, setSeleccionado] = useState(null)
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [nuevo, setNuevo] = useState(null) // { name, phone } mientras se crea
  const busqueda = useDebounce(limpiarBusqueda(texto), 250)
  const caja = useRef(null)

  // Cargar el cliente ya elegido (al editar)
  useEffect(() => {
    if (!value) { setSeleccionado(null); return }
    if (seleccionado?.id === value) return
    supabase.from('clients').select('id, name, phone').eq('id', value).single()
      .then(({ data }) => data && setSeleccionado(data))
  }, [value])

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    setBuscando(true)
    const consulta = busqueda
      ? buscarClientes(busqueda, 20)
      : supabase.from('clients').select('id, name, phone').order('name').limit(20).then(({ data }) => data ?? [])
    consulta.then((data) => {
      if (!vigente) return
      setResultados(data)
      setBuscando(false)
    })
    return () => { vigente = false }
  }, [busqueda, abierto])

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  function elegir(c) {
    setSeleccionado(c)
    onChange(c.id)
    setTexto('')
    setAbierto(false)
    setNuevo(null)
  }

  async function crear() {
    if (!nuevo.name.trim()) return
    const { data, error } = await supabase
      .from('clients')
      .insert({ name: nuevo.name.trim(), phone: nuevo.phone.replace(/\D/g, ''), user_id: user.id })
      .select('id, name, phone')
      .single()
    if (error) return avisar('No se pudo crear el cliente: ' + error.message, 'error')
    avisar(`Cliente ${data.name} creado`)
    elegir(data)
  }

  const campo = 'w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange'

  if (seleccionado && !abierto) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border">
        <div className="min-w-0 flex-1 truncate">
          {seleccionado.name}
          {seleccionado.phone && <span className="text-slate-400"> — {seleccionado.phone}</span>}
        </div>
        <button type="button" onClick={() => setAbierto(true)} className="shrink-0 text-xs text-panel-orange hover:underline">
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div ref={caja} className="relative">
      <input
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar por nombre o teléfono..."
        required={required && !value}
        className={campo}
        autoComplete="off"
      />
      {abierto && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-panel-border bg-panel-card shadow-xl">
          {nuevo ? (
            <div className="p-3 space-y-2">
              <div className="text-xs text-slate-400">Nuevo cliente</div>
              <input autoFocus value={nuevo.name} onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })} placeholder="Nombre" className={campo} />
              <input value={nuevo.phone} onChange={(e) => setNuevo({ ...nuevo, phone: e.target.value })} placeholder="Teléfono" inputMode="tel" className={campo} />
              <div className="flex gap-2">
                <button type="button" onClick={crear} className="flex-1 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600">Crear y elegir</button>
                <button type="button" onClick={() => setNuevo(null)} className="px-3 py-2 rounded-lg border border-panel-border text-sm">Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              {buscando && resultados.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">Buscando...</div>}
              {!buscando && resultados.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">Sin resultados</div>}
              {resultados.map((c) => (
                <button
                  type="button" key={c.id} onClick={() => elegir(c)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                >
                  {c.name} {c.phone && <span className="text-slate-400">— {c.phone}</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setNuevo({ name: /\d{5,}/.test(texto) ? '' : texto, phone: /\d{5,}/.test(texto) ? texto : '' })}
                className="block w-full text-left px-3 py-2 text-sm text-panel-orange border-t border-panel-border hover:bg-white/5"
              >
                + Crear cliente nuevo{texto && ` «${texto}»`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
