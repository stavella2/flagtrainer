import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CoachDashboard() {
  const nav = useNavigate()
  const [user, setUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { nav('/'); return }
      setUser(data.user)
      loadTeams()
    })
  }, [])

  async function loadTeams() {
    const { data } = await supabase.from('teams').select('*').order('created_at')
    setTeams(data || [])
    setLoading(false)
  }

  async function createTeam() {
    const name = prompt('Nombre del equipo:')
    if (!name) return
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { error } = await supabase.from('teams').insert({ name, slug, coach_id: user.id })
    if (error) return alert(error.message)
    loadTeams()
  }

  async function logout() {
    await supabase.auth.signOut()
    nav('/')
  }

  if (loading) return <div className="p-6 text-slate-400">Cargando…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis equipos</h1>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-200">Salir</button>
      </div>

      <button onClick={createTeam} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">
        + Crear equipo
      </button>

      {teams.length === 0 && <p className="text-slate-400 text-center py-8">Todavía no tenés equipos.</p>}

      <div className="space-y-3">
        {teams.map(t => (
          <div
            key={t.id}
            onClick={() => nav(`/coach/team/${t.id}`)}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-emerald-600 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-slate-500 font-mono break-all">/t/{t.access_token}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(`${window.location.origin}/t/${t.access_token}`)
                }}
                className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 whitespace-nowrap"
              >
                Copiar link
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}