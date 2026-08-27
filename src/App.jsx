import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import Login from './pages/Login'
import Clientes from './pages/Clientes'
import Pedidos from './pages/Pedidos'
import Agenda from './pages/Agenda'
import BuzonInterno from './pages/BuzonInterno'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-panel-bg text-slate-400">Cargando...</div>
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/buzon" element={<ProtectedRoute><BuzonInterno /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/clientes" replace />} />
    </Routes>
  )
}
