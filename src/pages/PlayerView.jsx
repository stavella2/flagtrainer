import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BLOCK_LABELS = {
  warmup: '🔥 Calentamiento',
  drill: '🎯 Drills',
  offense: '⚔️ Ofensiva',
  defense: '🛡️ Defensiva',
  scrimmage: '🏈 Scrimmage',
}

export default function PlayerView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [players, setPlayers] = useState([])
  const [rsvps, setRsvps] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [token])

  async function load() {
    setLoading(true)
    const [{ data: teamData }, { data: playersData }, { data: rsvpsData }] = await Promise.all([
      supabase.rpc('get_team_by_token', { p_token: token }),
      supabase.rpc('list_players_by_token', { p_token: token }),
      supabase.rpc('list_rsvps_by_token', { p_token: token }),
    ])
    if (teamData?.error) { setMsg('Link inválido'); setLoading(false); return }
    setData(teamData)
    setPlayers(playersData || [])
    setRsvps(rsvpsData || [])
    setLoading(false)
  }

  async function confirm(status) {
    if (!selected) return setMsg('Elegí tu nombre primero')
    const { data: res } = await supabase.rpc('rsvp_by_token', {
      p_token: token, p_player_id: selected, p_status: status,
    })
    if (res?.error) return setMsg('No se pudo confirmar: ' + res.error)
    setMsg('✅ Confirmado')
    load()
  }

  if (loading) return <div className="p-6 text-slate-400">Cargando…</div>
  if (!data) return <div className="p-6 text-red-400">{msg || 'Error'}</div>

  const t = data.next_training
  const myRsvp = rsvps.find(r => r.player_id === selected)

  return (
    <div className="max-w-md mx-auto p-5 space-y-5">
      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Equipo</p>
        <h1 className="text-2xl font-bold">{data.team.name}</h1>
      </div>

      {!t && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-400">
          No hay entrenamientos programados todavía.
        </div>
      )}

      {t && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Próximo entrenamiento</p>
          <p className="text-lg font-semibold">
            {new Date(t.date + 'T00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
            {t.start_time && ` · ${t.start_time.slice(0,5)}`}
          </p>
          {t.location && <p className="text-sm text-slate-400">📍 {t.location}</p>}
          {t.notes && <p className="text-sm text-slate-400 italic">{t.notes}</p>}

          <div className="space-y-2 pt-2">
            {t.blocks.map(b => (
              <div key={b.id} className="flex items-start justify-between gap-3 border-t border-slate-800 pt-2">
                <div>
                  <p className="text-sm font-medium">{BLOCK_LABELS[b.type] || b.type}</p>
                  <p className="text-xs text-slate-400">{b.title}</p>
                  {b.description && <p className="text-xs text-slate-500">{b.description}</p>}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{b.duration_min} min</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {t && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">¿Venís?</p>
          <select
            value={selected || ''}
            onChange={e => setSelected(e.target.value || null)}
            className="w-full px-3 py-3 rounded-lg bg-slate-800 border border-slate-700"
          >
            <option value="">Elegí tu nombre…</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.number ? `#${p.number} ` : ''}{p.name}</option>
            ))}
          </select>

          {myRsvp && (
            <p className="text-xs text-slate-400">
              Ya respondiste: <span className="font-semibold">{myRsvp.status === 'yes' ? 'Sí' : myRsvp.status === 'no' ? 'No' : 'Tal vez'}</span>
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => confirm('yes')} className="py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">Sí</button>
            <button onClick={() => confirm('maybe')} className="py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold">Tal vez</button>
            <button onClick={() => confirm('no')} className="py-3 rounded-lg bg-rose-700 hover:bg-rose-600 font-semibold">No</button>
          </div>
          {msg && <p className="text-sm text-emerald-400 text-center">{msg}</p>}

          {rsvps.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-1">Confirmados ({rsvps.filter(r => r.status === 'yes').length})</p>
              <p className="text-xs text-slate-400">
                {rsvps.filter(r => r.status === 'yes').map(r => r.name).join(', ') || '—'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}