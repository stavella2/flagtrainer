import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getYouTubeEmbedUrl } from '../lib/utils'

const BLOCK_TYPES = {
  warmup: '🔥 Calentamiento',
  drill: '🎯 Drills',
  offense: '⚔️ Ofensiva',
  defense: '🛡️ Defensiva',
  scrimmage: '🏈 Scrimmage',
}

export default function Templates() {
  const nav = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
    setIsAdmin(roleData?.role === 'admin')
    const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }

  async function approveTemplate(id) {
    if (!confirm('¿Aprobar esta plantilla para que todos la usen?')) return
    await supabase.from('templates').update({ status: 'approved' }).eq('id', id)
    load()
  }

  async function useTemplate(t) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: teams } = await supabase.from('teams').select('id, name').eq('coach_id', user.id)
    
    if (!teams || teams.length === 0) return alert('Primero tenés que crear un equipo.')

    const teamNames = teams.map((team, i) => `${i + 1}. ${team.name}`).join('\n')
    const selection = prompt(`¿A qué equipo querés agregar esta plantilla?\n\n${teamNames}\n\nEscribí el número:`)
    if (!selection) return
    const teamIndex = parseInt(selection) - 1
    if (!teams[teamIndex]) return alert('Opción inválida')

    const selectedTeam = teams[teamIndex]
    const { data: drafts } = await supabase.from('trainings').select('id').eq('team_id', selectedTeam.id).eq('status', 'draft').order('created_at', { ascending: false }).limit(1)
    if (!drafts || drafts.length === 0) return alert(`El equipo ${selectedTeam.name} no tiene entrenamientos en borrador. Creá uno primero.`)

    const trainingId = drafts[0].id
    const { count } = await supabase.from('training_blocks').select('*', { count: 'exact', head: true }).eq('training_id', trainingId)

    await supabase.from('training_blocks').insert({
      training_id: trainingId,
      type: t.type,
      title: t.title,
      description: t.description,
      duration_min: t.duration_min || 10, 
      diagram: t.diagram || {},
      video_url: t.video_url || null,
      order_index: count || 0
    })

    alert(`¡Plantilla agregada al borrador de ${selectedTeam.name}!`)
    nav(`/coach/team/${selectedTeam.id}/training/${trainingId}`)
  }

  const filteredTemplates = filter === 'all' ? templates : templates.filter(t => t.type === filter)

  if (loading) return <div className="p-6 text-slate-400">Cargando directorio…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex justify-between items-center mb-2">
        <button onClick={() => nav('/coach')} className="text-sm text-slate-400 hover:text-slate-200">← Volver</button>
        <h1 className="text-xl font-bold">Directorio de Plantillas</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${filter === 'all' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>Todas</button>
        {Object.entries(BLOCK_TYPES).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${filter === key ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>{label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredTemplates.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No hay plantillas en esta categoría.</p>}
        
        {filteredTemplates.map(t => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-semibold text-emerald-400 mb-1 block">{BLOCK_TYPES[t.type] || t.type}</span>
                <h2 className="font-semibold">{t.title}</h2>
                <p className="text-xs text-slate-400 mt-1">{t.description}</p>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.diagram && t.diagram.items && t.diagram.items.length > 0 && (
                    <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700 font-medium">🎨 Incluye pizarra</span>
                  )}
                  {t.video_url && getYouTubeEmbedUrl(t.video_url) && (
                    <span className="text-[10px] bg-slate-800 text-rose-400 px-2 py-0.5 rounded border border-slate-700 font-medium">▶️ Incluye video</span>
                  )}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${t.status === 'approved' ? 'bg-emerald-900 text-emerald-300' : t.status === 'pending' ? 'bg-amber-900 text-amber-300' : 'bg-slate-800'}`}>
                {t.status === 'approved' ? '✅' : t.status === 'pending' ? '⏳' : '❌'}
              </span>
            </div>
            
            {isAdmin && t.status === 'pending' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                <button onClick={() => approveTemplate(t.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium">Aprobar</button>
                <button onClick={() => alert('Función de rechazar pendiente')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm">Rechazar</button>
              </div>
            )}

            {t.status === 'approved' && (
              <button onClick={() => useTemplate(t)} className="mt-3 w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-medium transition">+ Usar esta plantilla</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}