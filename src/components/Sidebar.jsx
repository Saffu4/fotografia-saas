import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const links = [
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/pedidos', label: 'Pedidos', icon: '🧾' },
  { to: '/agenda', label: 'Agenda', icon: '📅' },
  { to: '/buzon', label: 'Buzón Interno', icon: '📥' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="w-60 shrink-0 bg-panel-card border-r border-panel-border flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 flex items-center gap-2 border-b border-panel-border">
        <div className="w-9 h-9 rounded-lg bg-panel-orange flex items-center justify-center font-bold">P</div>
        <div>
          <div className="font-semibold leading-tight">Panel Admin</div>
          <div className="text-xs text-slate-400 leading-tight">Sistema de Gestión</div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
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
  )
}
