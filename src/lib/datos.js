import { supabase } from './supabaseClient'

// Supabase devuelve como máximo 1000 filas por consulta. Esto trae todas,
// de a 1000, para reportes y respaldos.
export async function traerTodo(tabla, columnas = '*', configurar = (q) => q) {
  const filas = []
  const lote = 1000
  for (let desde = 0; ; desde += lote) {
    const { data, error } = await configurar(
      supabase.from(tabla).select(columnas).order('id').range(desde, desde + lote - 1)
    )
    if (error) throw error
    filas.push(...(data ?? []))
    if (!data || data.length < lote) return filas
  }
}
