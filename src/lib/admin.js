import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'

// Correos que pueden ver Reportes (y descargar respaldos).
// Se guardan como huella SHA-256 para que el correo no quede escrito en el
// código que descarga el navegador. Para agregar otro correo:
//   node -e "console.log(require('crypto').createHash('sha256').update('correo@ejemplo.com').digest('hex'))"
// y pega el resultado en la lista (o define VITE_ADMIN_EMAILS en Vercel,
// separados por coma).
const HUELLAS_ADMIN = [
  '03ebadd45e5ec0a8067d376779d368e610d67cbf69e92322cdc52069943c944c',
]

const EXTRA = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)

async function huella(texto) {
  const datos = new TextEncoder().encode(texto)
  const hash = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function esCorreoAdmin(correo) {
  const c = (correo ?? '').trim().toLowerCase()
  if (!c) return false
  if (EXTRA.includes(c)) return true
  return HUELLAS_ADMIN.includes(await huella(c))
}

// { esAdmin: true/false, cargando } según el correo de la sesión actual.
export function useEsAdmin() {
  const { user, loading } = useAuth()
  const [estado, setEstado] = useState({ esAdmin: false, cargando: true })

  useEffect(() => {
    if (loading) return
    let vigente = true
    esCorreoAdmin(user?.email).then((ok) => vigente && setEstado({ esAdmin: ok, cargando: false }))
    return () => { vigente = false }
  }, [user?.email, loading])

  return estado
}
