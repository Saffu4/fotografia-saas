import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useStats(refreshKey) {
  const [stats, setStats] = useState({ totalClients: 0, pendingOrders: 0, totalOrders: 0 })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [clientsRes, pendingRes, ordersRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Pendiente'),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
      ])

      if (!cancelled) {
        setStats({
          totalClients: clientsRes.count ?? 0,
          pendingOrders: pendingRes.count ?? 0,
          totalOrders: ordersRes.count ?? 0,
        })
      }
    }

    load()
    return () => { cancelled = true }
  }, [refreshKey])

  return stats
}
