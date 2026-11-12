import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import Login from './pages/Login'

// Cada pantalla se descarga solo cuando se abre (la primera carga es más liviana).
const Clientes = lazy(() => import('./pages/Clientes'))
const Pedidos = lazy(() => import('./pages/Pedidos'))
const Agenda = lazy(() => import('./pages/Agenda'))
const BuzonInterno = lazy(() => import('./pages/BuzonInterno'))
const Reportes = lazy(() => import('./pages/Reportes'))

const cargando = <div className="min-h-screen flex items-center justify-center bg-panel-bg text-slate-400">Cargando...</div>

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return cargando
  if (!user) return <Navigate to="/login" replace />
  return <Suspense fallback={cargando}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
      <Route path="/buzon" element={<ProtectedRoute><BuzonInterno /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/clientes" replace />} />
    </Routes>
  )
}
