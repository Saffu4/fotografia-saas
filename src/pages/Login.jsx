import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { avisar } from '../components/Avisos'

const EMPRESA = import.meta.env.VITE_COMPANY_NAME || 'Panel de Administración'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setError('Correo o contraseña incorrectos. Revisa que no tenga espacios ni mayúsculas de más.')
        return
      }
      navigate('/clientes')
    } catch {
      setError('No hay conexión. Revisa el internet e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function olvide() {
    if (!email.trim()) {
      setError('Escribe tu correo arriba y vuelve a tocar "Olvidé mi contraseña".')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer`,
    })
    if (error) return setError('No se pudo enviar el correo. Intenta en unos minutos.')
    setError('')
    avisar('Te enviamos un correo para crear una contraseña nueva.')
  }

  const campo = 'w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange'

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel-bg p-4">
      <form onSubmit={handleSubmit} className="bg-panel-card border border-panel-border rounded-xl p-6 sm:p-8 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/logo.png" alt=""
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            className="h-16 w-16 rounded-xl object-cover bg-white mb-3"
          />
          <div className="font-semibold text-lg">{EMPRESA}</div>
          <div className="text-xs text-slate-400">Sistema de gestión</div>
        </div>

        {error && <div role="alert" className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

        <label className="block text-sm mb-1 text-slate-300" htmlFor="correo">Correo</label>
        <input
          id="correo" type="email" required autoComplete="email" inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${campo} mb-4`}
        />

        <label className="block text-sm mb-1 text-slate-300" htmlFor="clave">Contraseña</label>
        <div className="relative mb-2">
          <input
            id="clave" type={verClave ? 'text' : 'password'} required autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${campo} pr-16`}
          />
          <button
            type="button" onClick={() => setVerClave((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-slate-400 hover:text-white"
          >
            {verClave ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        <button type="button" onClick={olvide} className="mb-6 text-xs text-panel-orange hover:underline">
          Olvidé mi contraseña
        </button>

        <button
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-panel-orange font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
