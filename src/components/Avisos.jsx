import { useEffect, useState } from 'react'

// Avisos ("Guardado") y confirmaciones con el diseño del sistema, en vez de
// las ventanas grises del navegador. Se usan sin hooks:
//   avisar('Pedido guardado')            → aviso verde abajo
//   avisar('No se pudo...', 'error')     → aviso rojo
//   if (!(await confirmar('¿Eliminar?', { peligro: true }))) return

let emitir = () => {}
let idAviso = 0

export function avisar(mensaje, tipo = 'ok') {
  emitir({ kind: 'aviso', id: ++idAviso, mensaje, tipo })
}

export function confirmar(mensaje, { titulo = '¿Confirmas?', aceptar = 'Sí, continuar', peligro = false } = {}) {
  return new Promise((resolver) => emitir({ kind: 'confirmar', mensaje, titulo, aceptar, peligro, resolver }))
}

export default function Avisos() {
  const [avisos, setAvisos] = useState([])
  const [pregunta, setPregunta] = useState(null)

  useEffect(() => {
    emitir = (ev) => {
      if (ev.kind === 'aviso') {
        setAvisos((a) => [...a, ev])
        setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== ev.id)), ev.tipo === 'error' ? 6000 : 2800)
      } else {
        setPregunta(ev)
      }
    }
    return () => { emitir = () => {} }
  }, [])

  function responder(si) {
    pregunta?.resolver(si)
    setPregunta(null)
  }

  useEffect(() => {
    if (!pregunta) return
    const tecla = (e) => { if (e.key === 'Escape') responder(false) }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [pregunta])

  return (
    <>
      <div className="fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {avisos.map((a) => (
          <div
            key={a.id} role="status"
            className={`pointer-events-auto max-w-md w-full sm:w-auto rounded-lg px-4 py-3 text-sm font-medium shadow-xl border ${
              a.tipo === 'error'
                ? 'bg-red-950 border-red-500/50 text-red-200'
                : 'bg-emerald-950 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {a.tipo === 'error' ? '⚠️ ' : '✓ '}{a.mensaje}
          </div>
        ))}
      </div>

      {pregunta && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={() => responder(false)}>
          <div
            role="alertdialog" aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-panel-card border border-panel-border rounded-t-2xl sm:rounded-xl p-5"
          >
            <h3 className="font-semibold text-lg mb-2">{pregunta.titulo}</h3>
            <p className="text-sm text-slate-300 whitespace-pre-line mb-5">{pregunta.mensaje}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => responder(false)} className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-panel-border text-slate-300 hover:bg-white/5">
                Cancelar
              </button>
              <button
                autoFocus onClick={() => responder(true)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium ${pregunta.peligro ? 'bg-red-600 hover:bg-red-500' : 'bg-panel-orange hover:bg-orange-600'}`}
              >
                {pregunta.aceptar}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
