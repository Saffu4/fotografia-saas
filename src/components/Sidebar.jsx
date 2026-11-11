import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const links = [
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/pedidos', label: 'Pedidos', icon: '🧾' },
  { to: '/agenda', label: 'Agenda', icon: '📅' },
  { to: '/buzon', label: 'Buzón Interno', icon: '📥' },
]

export default function Sidebar({ open = false, onClose = () => {} }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <>
    {/* Fondo oscuro detrás del menú en celular */}
    <div
      onClick={onClose}
      className={`fixed inset-0 z-40 bg-black/60 lg:hidden transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    />
    <aside className={`w-64 lg:w-60 shrink-0 bg-panel-card border-r border-panel-border flex flex-col h-screen
      fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0
      ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="px-5 py-6 flex items-center gap-2 border-b border-panel-border">
        <div className="w-9 h-9 rounded-lg bg-panel-orange flex items-center justify-center font-bold">P</div>
        <div>
          <div className="font-semibold leading-tight">Panel Admin</div>
          <div className="text-xs text-slate-400 leading-tight">Sistema de Gestión</div>
        </div>
        <button onClick={onClose} aria-label="Cerrar menú" className="ml-auto lg:hidden text-2xl leading-none text-slate-400 hover:text-white">×</button>
      </div>

      <nav className="flex-1 py-4">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors border-l-4 ${
                isActive
                  ? 'bg-panel-orange/10 border-panel-orange text-panel-orange'
                  : 'border-transparent text-slate-300 hover:bg-white/5'
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="m-4 px-4 py-2 text-sm rounded-lg border border-panel-border text-slate-300 hover:bg-white/5"
      >
        Cerrar sesión
      </button>
    </aside>
    </>
  )
}
