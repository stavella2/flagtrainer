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
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Estado para el nuevo jugador
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: '', pin: '' })
  
  // Estado para el panel de estadísticas desplegable
  const [expandedPlayer, setExpandedPlayer] = useState(null)

  useEffect(() => { load() }, [teamId])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: p }, { data: tr }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('players').select('*').eq('team_id', teamId).order('name'),
      supabase.from('trainings').select('*').eq('team_id', teamId).order('date', { ascending: false }),
    ])
    
    // Traemos toda la asistencia real de este equipo
    const { data: att } = await supabase
      .from('attendance')
      .select('*, trainings!inner(team_id, status)')
      .eq('trainings.team_id', teamId)
      .eq('trainings.status', 'done') // Solo contamos entrenamientos cerrados

    setTeam(t); setPlayers(p || []); setTrainings(tr || []); setAttendanceRecords(att || [])
    setLoading(false)
  }

  async function addPlayer(e) {
    e.preventDefault()
    if (!newPlayer.name.trim() || !newPlayer.pin.trim()) {
      return alert('El nombre y el PIN son obligatorios')
    }
    
    const { error } = await supabase.from('players').insert({
      team_id: teamId,
      name: newPlayer.name.trim(),
      number: newPlayer.number ? parseInt(newPlayer.number) : null,
      position: newPlayer.position || null,
      pin: newPlayer.pin,
    })
    
    if (error) return alert(error.message)
    setNewPlayer({ name: '', number: '', position: '', pin: '' })
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

  // Función para calcular las stats de un jugador
  function getPlayerStats(playerId) {
    const records = attendanceRecords.filter(a => a.player_id === playerId)
    const total = records.length
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length
    const absent = records.filter(r => r.status === 'absent').length
    const injured = records.filter(r => r.status === 'injured').length
    
    // Calcular racha (ordenamos por fecha de entrenamiento descendente)
    // Necesitamos cruzar con el array de trainings para saber la fecha
    const sortedRecords = records.map(r => {
      const training = trainings.find(t => t.id === r.training_id)
      return { ...r, date: training?.date }
    }).sort((a, b) => new Date(b.date) - new Date(a.date))

    let streak = 0
    for (const r of sortedRecords) {
      if (r.status === 'present' || r.status === 'late') streak++
      else break // Si falta o está lesionado, se corta la racha
    }

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0

    return { total, present, absent, injured, percentage, streak }
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
          className={`flex-1 py-2 rounded-lg font-medium transition ${tab === 'players' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >Jugadores ({players.length})</button>
        <button
          onClick={() => setTab('trainings')}
          className={`flex-1 py-2 rounded-lg font-medium transition ${tab === 'trainings' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >Entrenamientos ({trainings.length})</button>
      </div>

      {tab === 'players' && (
        <>
          <form onSubmit={addPlayer} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium border-b border-slate-800 pb-2">Agregar jugador</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Nombre" required
                value={newPlayer.name}
                onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
              />
              <input
                placeholder="Posición (opcional)"
                value={newPlayer.position}
                onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="#" type="number"
                value={newPlayer.number}
                onChange={e => setNewPlayer({ ...newPlayer, number: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
              />
              <input
                placeholder="PIN de 4 dígitos" type="text" maxLength={4} required
                value={newPlayer.pin}
                onChange={e => setNewPlayer({ ...newPlayer, pin: e.target.value.replace(/\D/g, '') })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
              />
            </div>
            <button className="w-full py-2 mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium">+ Agregar</button>
          </form>

          <div className="space-y-2">
            {players.map(p => {
              const stats = getPlayerStats(p.id)
              const isExpanded = expandedPlayer === p.id

              return (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  {/* Fila del jugador */}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {p.number && <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">#{p.number}</span>}
                        {p.name}
                        <span className="text-xs text-slate-500 font-normal">| PIN: {p.pin}</span>
                      </p>
                      {p.position && <p className="text-xs text-slate-500 mt-1">{p.position}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setExpandedPlayer(isExpanded ? null : p.id)}
                        className={`text-xs px-2 py-1.5 rounded transition ${isExpanded ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        📊 Stats
                      </button>
                      <button onClick={() => removePlayer(p.id)} className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1">Eliminar</button>
                    </div>
                  </div>

                  {/* Panel de Estadísticas Desplegable */}
                  {isExpanded && (
                    <div className="bg-slate-950 p-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Asistencia total</p>
                        <p className="font-bold text-lg">{stats.percentage}%</p>
                        <p className="text-xs text-slate-400">
                          {stats.present} de {stats.total} entrenos
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Racha actual</p>
                        <p className="font-bold text-lg text-amber-400">🔥 {stats.streak}</p>
                        <p className="text-xs text-slate-400">entrenos seguidos</p>
                      </div>
                      <div className="col-span-2 flex gap-4 border-t border-slate-800 pt-2 mt-1">
                        <p className="text-xs text-emerald-400">✅ {stats.present} Presentes</p>
                        <p className="text-xs text-rose-400">❌ {stats.absent} Faltas</p>
                        <p className="text-xs text-amber-400">🤕 {stats.injured} Lesiones</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
                {t.start_time && <p className="text-sm text-slate-400 mt-1">{t.start_time.slice(0,5)}</p>}
                {t.location && <p className="text-sm text-slate-400">📍 {t.location}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}