// Listas compartidas entre Agenda y Pedidos.
// Para agregar/renombrar una categoría o un estado, edita solo este archivo.

// Días sin entregar a partir de los cuales un pedido se marca como atrasado.
export const DIAS_ATRASO = 15
export const ESTADOS_ACTIVOS = ['Pendiente', 'En edición', 'Cola de impresión']

// Días desde la fecha del pedido (solo para pedidos que no se han entregado).
export function diasSinEntregar(pedido, hoy = new Date()) {
  if (!ESTADOS_ACTIVOS.includes(pedido.status) || !pedido.date) return null
  const [y, m, d] = pedido.date.split('-').map(Number)
  const inicio = new Date(y, m - 1, d)
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.max(0, Math.round((base - inicio) / 86400000))
}

export const ESTADOS_PEDIDO = ['Pendiente', 'En edición', 'Cola de impresión', 'Entregado', 'Cancelado']

export const ESTADO_BADGE = {
  'Pendiente': 'bg-amber-500/15 text-amber-400',
  'En edición': 'bg-sky-500/15 text-sky-400',
  'Cola de impresión': 'bg-violet-500/15 text-violet-400',
  'Entregado': 'bg-green-500/15 text-green-400',
  'Cancelado': 'bg-red-500/15 text-red-400',
}

// Personas que atienden pedidos (campo "Responsable"). Para agregar a
// alguien, escríbelo aquí.
export const RESPONSABLES = ['Maye', 'Gustavo', 'Yudith', 'Julieth', 'Jhoanys', 'Fotoshow']

// "maye " → "Maye"; un nombre que no está en la lista se deja como venía.
export function nombreResponsable(valor) {
  const v = (valor ?? '').trim()
  return RESPONSABLES.find((r) => r.toLowerCase() === v.toLowerCase()) ?? v
}

export function opcionesResponsable(valorActual) {
  const v = nombreResponsable(valorActual)
  return v && !RESPONSABLES.includes(v) ? [...RESPONSABLES, v] : RESPONSABLES
}

// Categorías de trabajo / sesión. Cada una tiene su color para que en la
// agenda se distingan a simple vista.
// `solo`: 'pedidos' o 'agenda' si la categoría aplica únicamente en uno de los
// dos; sin `solo` aparece en ambos.
export const CATEGORIAS = [
  { nombre: 'Fotoshow',   chip: 'bg-orange-500/15 text-orange-300 border-orange-500/30',   dot: 'bg-orange-500' },
  { nombre: 'Graduandos', chip: 'bg-blue-500/15 text-blue-300 border-blue-500/30',         dot: 'bg-blue-500' },
  { nombre: 'Yudith',     chip: 'bg-pink-500/15 text-pink-300 border-pink-500/30',         dot: 'bg-pink-500' },
  { nombre: 'Gustavo',    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-500' },
  { nombre: 'Maye',       chip: 'bg-violet-500/15 text-violet-300 border-violet-500/30',   dot: 'bg-violet-500' },
  { nombre: 'Eventos',    chip: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',   dot: 'bg-yellow-400' },
  { nombre: 'Marquetería', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30',        dot: 'bg-rose-500',  solo: 'pedidos' },
  { nombre: 'Sonido',     chip: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',         dot: 'bg-cyan-400',  solo: 'agenda' },
]

export function categoriasPara(lugar) {
  return CATEGORIAS.filter((c) => !c.solo || c.solo === lugar)
}

const SIN_CATEGORIA = { nombre: '', chip: 'bg-slate-500/15 text-slate-300 border-slate-500/30', dot: 'bg-slate-400' }

// Busca la categoría sin importar mayúsculas/tildes, para que los registros
// viejos escritos a mano ("yudith", "Judith", "graduandos ") también tomen color.
function normalizar(txt) {
  return (txt ?? '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}
const ALIAS = { judith: 'yudith', graduando: 'graduandos', evento: 'eventos', estudio: 'fotoshow', photoshop: 'fotoshow', marqueteria: 'marqueteria', marco: 'marqueteria', marcos: 'marqueteria' }

export function categoriaDe(valor) {
  let n = normalizar(valor)
  n = ALIAS[n] ?? n
  return CATEGORIAS.find((c) => normalizar(c.nombre) === n) ?? SIN_CATEGORIA
}

// "judith " -> "Yudith"; un valor que no es categoría se deja tal cual.
export function nombreCanonico(valor) {
  return categoriaDe(valor).nombre || (valor ?? '').trim()
}

// Opciones para un <select>: la lista fija + el valor actual si es uno viejo
// que no está en la lista (así no se pierde al editar).
export function opcionesCategoria(valorActual, lugar) {
  const nombres = categoriasPara(lugar).map((c) => c.nombre)
  if (valorActual && !nombres.includes(valorActual)) return [...nombres, valorActual]
  return nombres
}

// Fecha/hora LOCAL (Colombia) en formato de inputs. No usar toISOString()
// para esto: devuelve UTC y corre la hora 5 horas.
export function fechaLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function horaLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}
