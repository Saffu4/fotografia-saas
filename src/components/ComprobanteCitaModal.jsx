import { useState } from 'react'
import { categoriaDe } from '../lib/constantes'
import { enlaceWhatsApp, telefonoWhatsApp } from '../lib/utilidades'
import { avisar } from './Avisos'

// Tarjeta con los datos de UNA sola cita, pensada para tomarle pantallazo
// (o copiar el texto) y enviársela al cliente por WhatsApp.
export default function ComprobanteCitaModal({ session, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'Mi Empresa'
  const fecha = new Date(session.date)
  const fechaLarga = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fechaTxt = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)
  const horaTxt = fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
  const cliente = session.clients?.name ?? ''
  const telefono = session.clients?.phone ?? ''
  const cat = categoriaDe(session.studio)

  const texto = [
    `*${companyName}* — Confirmación de cita`,
    cliente && `Cliente: ${cliente}`,
    `Fecha: ${fechaTxt}`,
    `Hora: ${horaTxt}`,
    session.studio && `Sesión: ${session.studio}`,
  ].filter(Boolean).join('\n')

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      avisar('No se pudo copiar automáticamente. Usa el botón de WhatsApp.', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Esta tarjeta es lo que sale en el pantallazo */}
        <div className="rounded-2xl bg-white text-slate-900 overflow-hidden shadow-2xl">
          <div className="bg-panel-orange px-6 py-5 text-white text-center">
            <img
              src="/logo.jpg" alt=""
              onError={(e) => { e.currentTarget.style.display = 'none' }}
              className="mx-auto mb-2 h-14 w-14 rounded-full object-cover bg-white"
            />
            <div className="font-bold text-lg leading-tight">{companyName}</div>
            <div className="text-xs uppercase tracking-widest opacity-90 mt-1">Confirmación de cita</div>
          </div>
          <div className="px-6 py-5 space-y-4">
            {cliente && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Cliente</div>
                <div className="text-lg font-semibold">{cliente}</div>
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Fecha</div>
              <div className="font-semibold">{fechaTxt}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Hora</div>
              <div className="text-3xl font-bold text-panel-orange">{horaTxt}</div>
            </div>
            {session.studio && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${cat.dot}`} />
                <span className="font-medium">{session.studio}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <a
            href={enlaceWhatsApp(telefono, texto)} target="_blank" rel="noreferrer"
            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 font-medium text-sm text-center text-white"
          >
            {telefonoWhatsApp(telefono) ? 'Enviar por WhatsApp' : 'Abrir WhatsApp'}
          </a>
          <button onClick={copiar} className="px-3 py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600 text-sm">
            {copiado ? '✓ Copiado' : 'Copiar'}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-panel-border bg-panel-card text-slate-300 hover:bg-white/5 text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
