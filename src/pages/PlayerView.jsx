import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getYouTubeEmbedUrl, getGoogleCalendarUrl } from '../lib/utils'
import DrillViewer from '../components/DrillViewer'

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
  const [history, setHistory] = useState([])

  const [player, setPlayer] = useState(null)
  const [identifier, setIdentifier] = useState('')
  const [pin, setPin] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [openBlock, setOpenBlock] = useState(null)

  useEffect(() => {
    const savedPlayer = localStorage.getItem(`player_${token}`)
    const savedPin = localStorage.getItem(`pin_${token}`)
    
    if (savedPlayer && savedPin) {
      setPlayer(JSON.parse(savedPlayer))
      setPin(savedPin)
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
    
    const savedPlayer = localStorage.getItem(`player_${token}`)
    const savedPin = localStorage.getItem(`pin_${token}`)
    if (savedPlayer && savedPin) {
      const p = JSON.parse(savedPlayer)
      const { data: histData } = await supabase.rpc('get_player_history_by_token', {
        p_token: token, p_player_id: p.id, p_pin: savedPin
      })
      if (histData && !histData.error) setHistory(histData)
    }
    
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
      localStorage.setItem(`pin_${token}`, pin)
      
      const { data: histData } = await supabase.rpc('get_player_history_by_token', {
        p_token: token, p_player_id: res.player.id, p_pin: pin
      })
      if (histData && !histData.error) setHistory(histData)
    }
    setIsLoggingIn(false)
  }

  function logout() {
    setPlayer(null)
    setPin('')
    localStorage.removeItem(`player_${token}`)
    localStorage.removeItem(`pin_${token}`)
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

  // --- PANTALLA DE LOGIN ---
  if (!player) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          
          <div className="text-center mb-4 flex flex-col items-center">
            {data.team.logo_url ? (
              <img src={data.team.logo_url} alt="Logo" className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-slate-700 shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-3xl mb-3 border-2 border-slate-700">🏈</div>
            )}
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
            <button disabled={isLoggingIn} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50 transition">
              {isLoggingIn ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const t = data.next_training
  const myRsvp = rsvps.find(r => r.player_id === player.id)
  
  const isInjured = player.injured_until && new Date(player.injured_until) >= new Date(new Date().setHours(0,0,0,0))

  return (
    <div className="max-w-md mx-auto p-5 space-y-5">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-3">
          {data.team.logo_url ? (
            <img src={data.team.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl border border-slate-700">🏈</div>
          )}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{data.team.name}</p>
            <span className="text-sm text-slate-300">Hola, <strong className="text-white">{player.name}</strong></span>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 bg-slate-800 rounded">Salir</button>
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
            
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {t.location && <p className="text-sm text-slate-400">📍 {t.location}</p>}
              
              {/* BOTÓN DE CALENDARIO */}
              <a 
                href={getGoogleCalendarUrl(t, data.team.name)} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                📅 Agendar
              </a>
            </div>
            
            <div className="space-y-2 pt-2">
              {t.blocks.map(b => {
                const isOpen = openBlock === b.id;
                const hasDetails = b.description || b.video_url || (b.diagram && b.diagram.items && b.diagram.items.length > 0);

                return (
                  <div key={b.id} className="border-t border-slate-800 pt-2">
                    <div 
                      onClick={() => hasDetails && setOpenBlock(isOpen ? null : b.id)}
                      className={`flex items-start justify-between gap-3 p-1 rounded transition ${hasDetails ? 'cursor-pointer hover:bg-slate-800/50' : ''}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{BLOCK_LABELS[b.type] || b.type}</p>
                        <p className="text-xs text-slate-400">{b.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 whitespace-nowrap">{b.duration_min} min</span>
                        {hasDetails && <span className="text-xs text-slate-500">{isOpen ? '▲' : '▼'}</span>}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-2 pl-1 space-y-3 pb-2">
                        {b.description && <p className="text-xs text-slate-300 bg-slate-800/30 p-2 rounded">{b.description}</p>}
                        
                        {b.diagram && b.diagram.items && b.diagram.items.length > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Pizarra del ejercicio</p>
                            <DrillViewer data={b.diagram} />
                          </div>
                        )}

                        {b.video_url && (
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Video de referencia</p>
                            {(b.video_url.includes('youtube.com') || b.video_url.includes('youtu.be')) ? (
                              <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-700 bg-black">
                                <iframe 
                                  width="100%" 
                                  height="100%" 
                                  src={getYouTubeEmbedUrl(b.video_url) || `https://www.youtube.com/embed/${b.video_url.split('v=')[1]?.split('&')[0] || b.video_url.split('/').pop()}`} 
                                  title={b.title} 
                                  frameBorder="0" 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                  allowFullScreen
                                ></iframe>
                              </div>
                            ) : (
                              <a href={b.video_url} target="_blank" rel="noreferrer" className="text-sm text-emerald-400 underline break-all bg-slate-800 p-2 rounded block">
                                🔗 Abrir video externo
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* TARJETA DE ASISTENCIA Y LESIÓN */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">¿Venís?</p>
            
            {isInjured ? (
              <div className="bg-rose-950/30 border border-rose-900 p-4 rounded-lg text-center">
                <p className="text-rose-400 font-bold mb-1 text-lg">🤕 Estás en recuperación</p>
                <p className="text-xs text-slate-400">El cuerpo técnico te ha marcado como lesionado hasta el {new Date(player.injured_until + 'T00:00').toLocaleDateString('es')}. ¡Recuperate pronto!</p>
              </div>
            ) : (
              <>
                {myRsvp && (
                  <p className="text-sm text-center mb-2">
                    Ya respondiste: <span className="font-bold text-emerald-400">{myRsvp.status === 'yes' ? 'SÍ' : myRsvp.status === 'no' ? 'NO' : 'TAL VEZ'}</span>
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => confirm('yes')} className="py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold transition">Sí</button>
                  <button onClick={() => confirm('maybe')} className="py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold transition">Tal vez</button>
                  <button onClick={() => confirm('no')} className="py-3 rounded-lg bg-rose-700 hover:bg-rose-600 font-semibold transition">No</button>
                </div>
                {msg && <p className="text-sm text-emerald-400 text-center">{msg}</p>}
              </>
            )}
          </div>
        </>
      )}

      {/* HISTORIAL */}
      {history.length > 0 && (
        <div className="pt-4 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Entrenamientos anteriores</p>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(h.date + 'T00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {h.start_time && ` · ${h.start_time.slice(0,5)}`}
                  </p>
                  {h.location && <p className="text-xs text-slate-500">📍 {h.location}</p>}
                </div>
                <div className="text-right">
                  {h.my_rsvp ? (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      h.my_rsvp === 'yes' ? 'bg-emerald-900 text-emerald-300' : 
                      h.my_rsvp === 'no' ? 'bg-rose-900 text-rose-300' : 
                      'bg-amber-900 text-amber-300'
                    }`}>
                      {h.my_rsvp === 'yes' ? 'Dije: Sí' : h.my_rsvp === 'no' ? 'Dije: No' : 'Dije: Tal vez'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">Sin respuesta</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}