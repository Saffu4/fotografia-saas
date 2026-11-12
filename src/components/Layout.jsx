import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import StatCard from './StatCard'
import { useStats } from '../lib/useStats'

export default function Layout({ title, children, showStats = true, refreshKey }) {
  const stats = useStats(refreshKey)
  const [menuOpen, setMenuOpen] = useState(false)
  const empresa = import.meta.env.VITE_COMPANY_NAME || 'Panel'

  useEffect(() => { document.title = `${title} · ${empresa}` }, [title, empresa])

  return (
    <div className="flex min-h-screen bg-panel-bg">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="lg:hidden h-10 w-10 shrink-0 rounded-lg border border-panel-border flex items-center justify-center text-xl hover:bg-white/5"
          >
            ☰
          </button>
          <h1 className="text-lg sm:text-2xl font-semibold truncate">{title}</h1>
        </div>

        {showStats && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
            <StatCard icon="👥" label="Total Clientes" value={stats.totalClients} color="orange" />
            <StatCard icon="⏱" label="Pedidos Pendientes" value={stats.pendingOrders} color="blue" />
            <StatCard icon="🛒" label="Total Pedidos" value={stats.totalOrders} color="green" />
          </div>
        )}

        {children}
      </main>
    </div>
  )
}
