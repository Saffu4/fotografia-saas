import { useEffect, useState } from 'react'

// ---------- Búsqueda ----------
// Supabase usa coma, paréntesis, asterisco y porcentaje como sintaxis en los
// filtros .or(); si el usuario los escribe ("Pérez, Ana") la consulta falla.
export function limpiarBusqueda(texto) {
  return (texto ?? '').replace(/[,()*%\\"':]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Espera a que el usuario deje de escribir antes de consultar la base.
export function useDebounce(valor, ms = 300) {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return v
}

// ---------- Dinero ----------
export const pesos = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-CO')

// ---------- WhatsApp ----------
// Devuelve el número en formato internacional para wa.me, o null si no sirve.
// Colombia: celulares de 10 dígitos que empiezan por 3 → 57 + número.
export function telefonoWhatsApp(telefono) {
  const d = (telefono ?? '').replace(/\D/g, '')
  if (d.length === 10 && d.startsWith('3')) return '57' + d
  if (d.length === 12 && d.startsWith('57')) return d
  if (d.length >= 11) return d
  return null
}

export function enlaceWhatsApp(telefono, mensaje) {
  const n = telefonoWhatsApp(telefono)
  const texto = encodeURIComponent(mensaje)
  return n ? `https://wa.me/${n}?text=${texto}` : `https://wa.me/?text=${texto}`
}

// ---------- CSV ----------
function celda(v) {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function aCSV(filas) {
  if (!filas.length) return ''
  const cols = [...new Set(filas.flatMap((f) => Object.keys(f)))]
  return [cols.join(','), ...filas.map((f) => cols.map((c) => celda(f[c])).join(','))].join('\n')
}

export function descargar(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  // BOM para que Excel abra bien las tildes
  const blob = new Blob(['﻿' + contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
