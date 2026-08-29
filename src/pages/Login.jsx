import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Correo o contraseña incorrectos.')
        return
      }
      navigate('/clientes')
    } catch {
      setError('No se pudo conectar con el servidor. Revisa la configuración de Supabase.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel-bg">
      <form onSubmit={handleSubmit} className="bg-panel-card border border-panel-border rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-panel-orange flex items-center justify-center font-bold">P</div>
          <div>
            <div className="font-semibold leading-tight">Panel Admin</div>
            <div className="text-xs text-slate-400 leading-tight">Sistema de Gestión</div>
          </div>
        </div>

        <h1 className="text-xl font-semibold mb-4">Iniciar sesión</h1>

        {error && <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

        <label className="block text-sm mb-1 text-slate-300">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
        />

        <label className="block text-sm mb-1 text-slate-300">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded-lg bg-panel-bg border border-panel-border outline-none focus:border-panel-orange"
        />

        <button
          disabled={loading}
          className="w-full py-2 rounded-lg bg-panel-orange font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-xs text-slate-500 mt-4">
          Los usuarios se crean desde el panel de Supabase (Authentication → Users) o habilitando el registro público.
        </p>
      </form>
    </div>
  )
}
