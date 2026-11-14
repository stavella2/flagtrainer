import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BLOCK_LABELS = {
  warmup: '🔥 Calentamiento', drill: '🎯 Drills', offense: '⚔️ Ofensiva',
  defense: '🛡️ Defensiva', scrimmage: '🏈 Scrimmage',
}

export default function PlayerView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Sesión del jugador
  const [player, setPlayer] = useState(null)
  const [identifier, setIdentifier] = useState('') // Número o nombre
  const [pin, setPin] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    const savedPlayer = localStorage.getItem(`player_${token}`)
    const savedPin = localStorage.getItem(`pin_${token}`)
    
    if (savedPlayer && savedPin) {
      setPlayer(JSON.parse(savedPlayer))
      setPin(savedPin) // <-- Recuperamos el PIN guardado
    }
    load()
  }, [token])

  async function load() {
    setLoading(true)
    const [{ data: teamData }, { data: rsvpsData }] = await Promise.all([
      supabase.rpc('get_team_by_token', { p_token: token }),
      supabase.rpc('list_rsvps_by_token', { p_token: token }),
    ])
    if (teamData?.error) { setMsg('Link inválido'); setLoading(false); return }
    setData(teamData)
    setRsvps(rsvpsData || [])
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setIsLoggingIn(true); setLoginError('')
    const { data: res } = await supabase.rpc('login_player_by_token', {
      p_token: token, p_identifier: identifier, p_pin: pin,
    })
    if (res?.error) {
      setLoginError(res.error)
    } else {
      setPlayer(res.player)
      localStorage.setItem(`player_${token}`, JSON.stringify(res.player))
      localStorage.setItem(`pin_${token}`, pin) // <-- Guardamos el PIN
    }
    setIsLoggingIn(false)
  }

  function logout() {
    setPlayer(null)
    setPin('')
    localStorage.removeItem(`player_${token}`)
    localStorage.removeItem(`pin_${token}`) // <-- Borramos el PIN al salir
  }

  async function confirm(status) {
    const { data: res } = await supabase.rpc('rsvp_by_token', {
      p_token: token, p_player_id: player.id, p_pin: pin, p_status: status,
    })
    if (res?.error) return setMsg('No se pudo confirmar: ' + res.error)
    setMsg('✅ Confirmado')
    load()
  }

  if (loading) return <div className="p-6 text-slate-400">Cargando…</div>
  if (!data) return <div className="p-6 text-red-400">{msg || 'Error'}</div>

  // Si no está logueado, mostramos la pantalla de Login
  if (!player) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="text-center mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Equipo</p>
            <h1 className="text-2xl font-bold">{data.team.name}</h1>
          </div>
          <p className="text-sm text-slate-400 text-center">Ingresá para confirmar tu asistencia</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              placeholder="Tu número de camiseta (o nombre)"
              value={identifier} onChange={e => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500"
            />
            <input
              type="password" inputMode="numeric" maxLength={4} placeholder="Tu PIN de 4 dígitos"
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500"
            />
            {loginError && <p className="text-sm text-rose-400 text-center">{loginError}</p>}
            <button disabled={isLoggingIn} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50">
              {isLoggingIn ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Si está logueado, mostramos el entrenamiento
  const t = data.next_training
  const myRsvp = rsvps.find(r => r.player_id === player.id)

  return (
    <div className="max-w-md mx-auto p-5 space-y-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-slate-400">Hola, <strong className="text-slate-200">{player.name}</strong></span>
        <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300">Salir</button>
      </div>

      {!t ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-400">
          No hay entrenamientos programados.
        </div>
      ) : (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Próximo entrenamiento</p>
            <p className="text-lg font-semibold">
              {new Date(t.date + 'T00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              {t.start_time && ` · ${t.start_time.slice(0,5)}`}
            </p>
            {t.location && <p className="text-sm text-slate-400">📍 {t.location}</p>}
            <div className="space-y-2 pt-2">
              {t.blocks.map(b => (
                <div key={b.id} className="flex items-start justify-between gap-3 border-t border-slate-800 pt-2">
                  <div>
                    <p className="text-sm font-medium">{BLOCK_LABELS[b.type] || b.type}</p>
                    <p className="text-xs text-slate-400">{b.title}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{b.duration_min} min</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">¿Venís?</p>
            {myRsvp && (
              <p className="text-sm text-center mb-2">
                Ya respondiste: <span className="font-bold text-emerald-400">{myRsvp.status === 'yes' ? 'SÍ' : myRsvp.status === 'no' ? 'NO' : 'TAL VEZ'}</span>
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => confirm('yes')} className="py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">Sí</button>
              <button onClick={() => confirm('maybe')} className="py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold">Tal vez</button>
              <button onClick={() => confirm('no')} className="py-3 rounded-lg bg-rose-700 hover:bg-rose-600 font-semibold">No</button>
            </div>
            {msg && <p className="text-sm text-emerald-400 text-center">{msg}</p>}
          </div>
        </>
      )}
    </div>
  )
}