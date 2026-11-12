import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { avisar } from '../components/Avisos'

// Página a la que llega el enlace del correo "Olvidé mi contraseña".
export default function Restablecer() {
  const { user, loading } = useAuth()
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  async function guardar(e) {
    e.preventDefault()
    if (clave.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (clave !== clave2) return setError('Las dos contraseñas no coinciden.')
    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password: clave })
    setGuardando(false)
    if (error) return setError('No se pudo cambiar la contraseña. Pide un correo nuevo.')
    avisar('Contraseña actualizada')
    navigate('/clientes')
  }

  const campo = 'w-full mb-4 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange'

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel-bg p-4">
      <form onSubmit={guardar} className="bg-panel-card border border-panel-border rounded-xl p-6 sm:p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">Nueva contraseña</h1>
        {loading ? (
          <p className="text-slate-400 text-sm">Cargando...</p>
        ) : !user ? (
          <p className="text-slate-300 text-sm">El enlace venció o ya se usó. Vuelve a la pantalla de inicio y toca "Olvidé mi contraseña" otra vez.</p>
        ) : (
          <>
            {error && <div role="alert" className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
            <label className="block text-sm mb-1 text-slate-300">Contraseña nueva</label>
            <input type="password" required autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} className={campo} />
            <label className="block text-sm mb-1 text-slate-300">Repite la contraseña</label>
            <input type="password" required autoComplete="new-password" value={clave2} onChange={(e) => setClave2(e.target.value)} className={campo} />
            <button disabled={guardando} className="w-full py-2.5 rounded-lg bg-panel-orange font-medium hover:bg-orange-600 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
