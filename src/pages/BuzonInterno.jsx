import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'

export default function BuzonInterno() {
  const [items, setItems] = useState([])
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('company_suggestions')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    const { error } = await supabase.from('company_suggestions').insert({
      author_name: author.trim() || 'Anónimo',
      content: content.trim(),
    })
    if (error) return alert('Error: ' + error.message)
    setContent('')
    load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta nota del buzón?')) return
    await supabase.from('company_suggestions').delete().eq('id', id)
    load()
  }

  return (
    <Layout title="Panel de Administración" showStats={false}>
      <div className="bg-panel-card border border-panel-border rounded-xl p-6 max-w-2xl">
        <h2 className="font-semibold text-lg mb-4">Buzón Interno</h2>

        <form onSubmit={handleSubmit} className="mb-6 space-y-3">
          <input
            placeholder="Tu nombre (opcional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-sm"
          />
          <textarea
            rows={3}
            placeholder="Escribe una sugerencia o nota interna..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-sm"
          />
          <button className="px-4 py-2 rounded-lg bg-panel-orange text-sm font-medium hover:bg-orange-600">
            Enviar
          </button>
        </form>

        <div className="space-y-3">
          {loading && <div className="text-slate-500 text-sm">Cargando...</div>}
          {!loading && items.length === 0 && <div className="text-slate-500 text-sm">El buzón está vacío.</div>}
          {items.map((it) => (
            <div key={it.id} className="border border-panel-border rounded-lg p-3 text-sm">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{it.author_name}</span>
                <span>{new Date(it.created_at).toLocaleString('es-CO')}</span>
              </div>
              <p className="mb-2">{it.content}</p>
              <button onClick={() => handleDelete(it.id)} className="text-red-400 hover:text-red-300 text-xs">Eliminar</button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
