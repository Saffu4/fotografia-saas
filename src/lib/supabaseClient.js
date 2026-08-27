import { createClient } from '@supabase/supabase-js'

// Estos valores se leen del archivo .env (ver .env.example).
// Vite solo expone variables que empiecen con VITE_.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env y completa tus credenciales.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
