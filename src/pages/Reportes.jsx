import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { traerTodo } from '../lib/datos'
import { categoriaDe } from '../lib/constantes'
import { pesos, aCSV, descargar, enlaceWhatsApp } from '../lib/utilidades'
import { avisar } from '../components/Avisos'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const TABLAS_RESPALDO = [
  ['clients', 'Clientes'],
  ['orders', 'Pedidos'],
  ['payments', 'Abonos'],
  ['sessions', 'Agenda'],
  ['order_observations', 'Observaciones'],
  ['company_suggestions', 'Buzón'],
]

function claveMes(fecha) { return fecha.slice(0, 7) } // 'YYYY-MM'

export default function Reportes() {
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [respaldando, setRespaldando] = useState('')

  useEffect(() => {
    Promise.all([
      traerTodo('orders', 'id, order_number, date, work_type, total, advance, balance, status, clients(name, phone)'),
      traerTodo('payments', 'id, amount, payment_date'),
    ])
      .then(([o, p]) => { setOrders(o); setPayments(p) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const activos = useMemo(() => orders.filter((o) => o.status !== 'Cancelado'), [orders])

  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

  const resumen = useMemo(() => {
    const conSaldo = activos.filter((o) => Number(o.balance) > 0)
    const local = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
    return {
      cartera: conSaldo.reduce((s, o) => s + Number(o.balance), 0),
      pedidosConSaldo: conSaldo.length,
      ventasMes: activos.filter((o) => claveMes(o.date ?? '') === mesActual).reduce((s, o) => s + Number(o.total || 0), 0),
      recaudoMes: payments.filter((p) => local(p.payment_date) === mesActual).reduce((s, p) => s + Number(p.amount || 0), 0),
    }
  }, [activos, payments, mesActual])

  // Ventas de los últimos 12 meses
  const porMes = useMemo(() => {
    const meses = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      meses.push({ clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, etiqueta: MESES[d.getMonth()], anio: d.getFullYear(), total: 0, pedidos: 0 })
    }
    const idx = Object.fromEntries(meses.map((m, i) => [m.clave, i]))
    for (const o of activos) {
      const i = idx[claveMes(o.date ?? '')]
      if (i !== undefined) { meses[i].total += Number(o.total || 0); meses[i].pedidos++ }
    }
    return meses
  }, [activos])
  const maxMes = Math.max(1, ...porMes.map((m) => m.total))

  // Ventas por categoría en el año elegido
  const anios = useMemo(() => [...new Set(orders.map((o) => Number((o.date ?? '').slice(0, 4))).filter(Boolean))].sort((a, b) => b - a), [orders])
  const porCategoria = useMemo(() => {
    const m = {}
    for (const o of activos) {
      if (!(o.date ?? '').startsWith(String(anio))) continue
      const nombre = categoriaDe(o.work_type).nombre || o.work_type || 'Sin tipo'
      m[nombre] ??= { nombre, total: 0, pedidos: 0 }
      m[nombre].total += Number(o.total || 0)
      m[nombre].pedidos++
    }
    return Object.values(m).sort((a, b) => b.total - a.total)
  }, [activos, anio])
  const totalAnio = porCategoria.reduce((s, c) => s + c.total, 0)
  const maxCat = Math.max(1, ...porCategoria.map((c) => c.total))

  // Cartera: clientes que deben, de mayor a menor
  const cartera = useMemo(() => {
    const m = {}
    for (const o of activos) {
      if (!(Number(o.balance) > 0)) continue
      const k = o.clients?.name ?? 'Sin cliente'
      m[k] ??= { cliente: k, telefono: o.clients?.phone ?? '', saldo: 0, pedidos: [] }
      m[k].saldo += Number(o.balance)
      m[k].pedidos.push(o.order_number)
    }
    return Object.values(m).sort((a, b) => b.saldo - a.saldo)
  }, [activos])

  function exportarCartera() {
    descargar(`cartera-${hoy.toISOString().slice(0, 10)}.csv`, aCSV(cartera.map((c) => ({
      cliente: c.cliente, telefono: c.telefono, saldo: c.saldo, pedidos: c.pedidos.join(' '),
    }))))
  }

  async function respaldar(tabla, nombre) {
    setRespaldando(nombre)
    try {
      const filas = await traerTodo(tabla)
      descargar(`respaldo-${tabla}-${hoy.toISOString().slice(0, 10)}.csv`, aCSV(filas))
    } catch (e) {
      avisar(`No se pudo respaldar ${nombre}: ${e.message}`, 'error')
    }
    setRespaldando('')
  }

  async function respaldarTodo() {
    for (const [t, n] of TABLAS_RESPALDO) {
      await respaldar(t, n)
      await new Promise((r) => setTimeout(r, 400))
    }
  }

  const tarjeta = 'bg-panel-card border border-panel-border rounded-xl p-4 sm:p-6'

  return (
    <Layout title="Reportes" showStats={false}>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-300 text-sm">Error cargando datos: {error}</div>}
      {loading ? (
        <div className={`${tarjeta} text-center text-slate-500`}>Cargando reportes...</div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Cifras clave */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {[
              ['Por cobrar (cartera)', pesos(resumen.cartera), `${resumen.pedidosConSaldo} pedidos con saldo`],
              ['Vendido este mes', pesos(resumen.ventasMes), 'según fecha del pedido'],
              ['Recaudado este mes', pesos(resumen.recaudoMes), 'abonos registrados'],
              ['Clientes que deben', String(cartera.length), 'con saldo pendiente'],
            ].map(([label, valor, nota]) => (
              <div key={label} className="bg-panel-card border border-panel-border rounded-xl p-3 sm:p-5 min-w-0">
                <div className="text-xs text-slate-400">{label}</div>
                <div className="text-lg sm:text-2xl font-bold truncate">{valor}</div>
                <div className="text-[11px] text-slate-500">{nota}</div>
              </div>
            ))}
          </div>

          {/* Ventas por mes */}
          <section className={tarjeta}>
            <h2 className="font-semibold">Ventas de los últimos 12 meses</h2>
            <p className="text-xs text-slate-400 mb-4">Total de pedidos no cancelados, por fecha del pedido.</p>
            <div className="flex items-end gap-1 sm:gap-2 h-48 border-b border-panel-border">
              {porMes.map((m) => (
                <div key={m.clave} className="group relative flex-1 h-full flex flex-col justify-end items-center">
                  <div className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded-md bg-slate-900 border border-panel-border px-2 py-1 text-xs">
                    {m.etiqueta} {m.anio}: <b>{pesos(m.total)}</b> · {m.pedidos} pedidos
                  </div>
                  <div
                    className={`w-full max-w-10 rounded-t ${m.clave === mesActual ? 'bg-panel-orange' : 'bg-panel-orange/45'} group-hover:bg-panel-orange transition-colors`}
                    style={{ height: `${(m.total / maxMes) * 100}%`, minHeight: m.total ? 2 : 0 }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1 sm:gap-2 mt-1">
              {porMes.map((m) => (
                <div key={m.clave} className="flex-1 text-center text-[10px] sm:text-xs text-slate-400">{m.etiqueta}</div>
              ))}
            </div>
          </section>

          {/* Ventas por categoría */}
          <section className={tarjeta}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold">Ventas por tipo de trabajo</h2>
                <p className="text-xs text-slate-400">Total {anio}: {pesos(totalAnio)}</p>
              </div>
              <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-sm">
                {(anios.length ? anios : [anio]).map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            {porCategoria.length === 0 && <div className="text-sm text-slate-500">Sin pedidos en {anio}.</div>}
            <div className="space-y-3">
              {porCategoria.map((c) => (
                <div key={c.nombre} className="text-sm">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${categoriaDe(c.nombre).dot}`} />
                      <span className="truncate">{c.nombre}</span>
                      <span className="text-slate-500 text-xs">{c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'}</span>
                    </span>
                    <span className="font-medium whitespace-nowrap">
                      {pesos(c.total)} <span className="text-slate-500 text-xs">{Math.round((c.total / (totalAnio || 1)) * 100)}%</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-panel-bg overflow-hidden">
                    <div className={`h-full rounded-full ${categoriaDe(c.nombre).dot}`} style={{ width: `${(c.total / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cartera */}
          <section className={tarjeta}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold">Cartera por cliente</h2>
                <p className="text-xs text-slate-400">{cartera.length} clientes deben {pesos(resumen.cartera)}</p>
              </div>
              {cartera.length > 0 && (
                <button onClick={exportarCartera} className="px-3 py-2 rounded-lg border border-panel-border text-sm hover:bg-white/5">Exportar CSV</button>
              )}
            </div>
            <ul className="divide-y divide-panel-border/60 text-sm">
              {cartera.length === 0 && <li className="py-2 text-slate-500">Nadie debe. 🎉</li>}
              {cartera.map((c) => (
                <li key={c.cliente} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{c.cliente}</span>
                  <span className="text-xs text-slate-500">#{c.pedidos.join(', #')}</span>
                  <span className="ml-auto font-semibold text-amber-400">{pesos(c.saldo)}</span>
                  {c.telefono && (
                    <a
                      href={enlaceWhatsApp(c.telefono, `Hola ${c.cliente}, te recordamos que tienes un saldo pendiente de ${pesos(c.saldo)} con ${import.meta.env.VITE_COMPANY_NAME || 'nosotros'}. ¡Gracias!`)}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-green-400 hover:underline"
                    >
                      Recordar por WhatsApp
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Respaldo */}
          <section className={tarjeta}>
            <h2 className="font-semibold">Respaldo de datos</h2>
            <p className="text-xs text-slate-400 mb-4">Descarga cada tabla en CSV (se abre en Excel). Recomendado una vez por semana.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={respaldarTodo} disabled={!!respaldando} className="px-4 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                {respaldando ? `Descargando ${respaldando}...` : 'Descargar todo'}
              </button>
              {TABLAS_RESPALDO.map(([t, n]) => (
                <button key={t} onClick={() => respaldar(t, n)} disabled={!!respaldando} className="px-3 py-2 rounded-lg border border-panel-border text-sm hover:bg-white/5 disabled:opacity-50">
                  {n}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </Layout>
  )
}
