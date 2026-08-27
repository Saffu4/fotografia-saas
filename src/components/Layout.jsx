import Sidebar from './Sidebar'
import StatCard from './StatCard'
import { useStats } from '../lib/useStats'

export default function Layout({ title, children, showStats = true, refreshKey }) {
  const stats = useStats(refreshKey)

  return (
    <div className="flex min-h-screen bg-panel-bg">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>

        {showStats && (
          <div className="flex gap-4 mb-8">
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
