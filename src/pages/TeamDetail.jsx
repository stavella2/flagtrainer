import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function TeamDetail() {
  const { teamId } = useParams()
  const nav = useNavigate()
  const [team, setTeam] = useState(null)
  const [tab, setTab] = useState('players')
  const [players, setPlayers] = useState([])
  const [trainings, setTrainings] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: '' })

  useEffect(() => { load() }, [teamId])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: p }, { data: tr }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('players').select('*').eq('team_id', teamId).order('name'),
      supabase.from('trainings').select('*').eq('team_id', teamId).order('date', { ascending: false }),
    ])
    setTeam(t); setPlayers(p || []); setTrainings(tr || [])
    setLoading(false)
  }

  async function addPlayer(e) {
    e.preventDefault()
    if (!newPlayer.name.trim()) return
    const { error } = await supabase.from('players').insert({
      team_id: teamId,
      name: newPlayer.name.trim(),
      number: newPlayer.number ? parseInt(newPlayer.number) : null,
      position: newPlayer.position || null,
    })
    if (error) return alert(error.message)
    setNewPlayer({ name: '', number: '', position: '' })
    load()
  }

  async function removePlayer(id) {
    if (!confirm('¿Eliminar jugador?')) return
    await supabase.from('players').delete().eq('id', id)
    load()
  }

  async function createTraining() {
    const { data, error } = await supabase.from('trainings').insert({
      team_id: teamId,
      date: new Date().toISOString().slice(0, 10),
      status: 'draft',
    }).select().single()
    if (error) return alert(error.message)
    nav(`/coach/team/${teamId}/training/${data.id}`)
  }

  if (loading) return <div className="p-6 text-slate-400">Cargando…</div>
  if (!team) return <div className="p-6 text-red-400">Equipo no encontrado</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <button onClick={() => nav('/coach')} className="text-sm text-slate-400 hover:text-slate-200">← Volver</button>
      <div>
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="text-xs text-slate-500 font-mono break-all">/t/{team.access_token}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('players')}
          className={`flex-1 py-2 rounded-lg font-medium ${tab === 'players' ? 'bg-emerald-600' : 'bg-slate-800'}`}
        >Jugadores ({players.length})</button>
        <button
          onClick={() => setTab('trainings')}
          className={`flex-1 py-2 rounded-lg font-medium ${tab === 'trainings' ? 'bg-emerald-600' : 'bg-slate-800'}`}
        >Entrenamientos ({trainings.length})</button>
      </div>

      {tab === 'players' && (
        <>
          <form onSubmit={addPlayer} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">Agregar jugador</p>
            <div className="grid grid-cols-4 gap-2">
              <input
                placeholder="Nombre" required
                value={newPlayer.name}
                onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
              />
              <input
                placeholder="#" type="number"
                value={newPlayer.number}
                onChange={e => setNewPlayer({ ...newPlayer, number: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
              />
              <input
                placeholder="Posición"
                value={newPlayer.position}
                onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
              />
            </div>
            <button className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium">+ Agregar</button>
          </form>

          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {p.number && <span className="text-slate-400">#{p.number} </span>}
                    {p.name}
                  </p>
                  {p.position && <p className="text-xs text-slate-500">{p.position}</p>}
                </div>
                <button onClick={() => removePlayer(p.id)} className="text-xs text-rose-400 hover:text-rose-300 px-2">Eliminar</button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'trainings' && (
        <>
          <button onClick={createTraining} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">
            + Nuevo entrenamiento
          </button>
          <div className="space-y-2">
            {trainings.map(t => (
              <div
                key={t.id}
                onClick={() => nav(`/coach/team/${teamId}/training/${t.id}`)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-emerald-600 transition"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {new Date(t.date + 'T00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    t.status === 'published' ? 'bg-emerald-900 text-emerald-300' :
                    t.status === 'done' ? 'bg-slate-700 text-slate-300' :
                    'bg-amber-900 text-amber-300'
                  }`}>{t.status}</span>
                </div>
                {t.start_time && <p className="text-sm text-slate-400">{t.start_time.slice(0,5)}</p>}
                {t.location && <p className="text-sm text-slate-400">📍 {t.location}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}