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

// Busca clientes sin importar tildes ("sofia" → "Sofía"). Usa la función
// buscar_clientes de Supabase (supabase/migracion_2026-11_busqueda.sql); si
// todavía no está instalada, busca como antes (sensible a tildes).
export async function buscarClientes(texto, limite = 50, columnas = 'id, name, phone') {
  const { data, error } = await supabase.rpc('buscar_clientes', { q: texto, lim: limite }).select(columnas)
  if (!error) return data ?? []
  const { data: d2 } = await supabase.from('clients').select(columnas)
    .or(`name.ilike.%${texto}%,phone.ilike.%${texto}%,address.ilike.%${texto}%`)
    .order('name').limit(limite)
  return d2 ?? []
}
