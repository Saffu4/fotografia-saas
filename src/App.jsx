import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { useEsAdmin } from './lib/admin'
import Login from './pages/Login'

// Cada pantalla se descarga solo cuando se abre (la primera carga es más liviana).
const Clientes = lazy(() => import('./pages/Clientes'))
const Pedidos = lazy(() => import('./pages/Pedidos'))
const Agenda = lazy(() => import('./pages/Agenda'))
const BuzonInterno = lazy(() => import('./pages/BuzonInterno'))
const Reportes = lazy(() => import('./pages/Reportes'))

const cargandoVista = <div className="min-h-screen flex items-center justify-center bg-panel-bg text-slate-400">Cargando...</div>

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return cargandoVista
  if (!user) return <Navigate to="/login" replace />
  return <Suspense fallback={cargandoVista}>{children}</Suspense>
}

// Solo el correo del dueño entra a Reportes; a los demás los manda a Clientes.
function AdminRoute({ children }) {
  const { esAdmin, cargando } = useEsAdmin()
  if (cargando) return cargandoVista
  if (!esAdmin) return <Navigate to="/clientes" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute><AdminRoute><Reportes /></AdminRoute></ProtectedRoute>} />
      <Route path="/buzon" element={<ProtectedRoute><BuzonInterno /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/clientes" replace />} />
    </Routes>
  )
}
