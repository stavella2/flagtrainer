import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BLOCK_TYPES = [
  { value: 'warmup',    label: '🔥 Calentamiento' },
  { value: 'drill',     label: '🎯 Drills' },
  { value: 'offense',   label: '⚔️ Ofensiva' },
  { value: 'defense',   label: '🛡️ Defensiva' },
  { value: 'scrimmage', label: '🏈 Scrimmage' },
]

export default function TrainingEditor() {
  const { teamId, trainingId } = useParams()
  const nav = useNavigate()
  const [training, setTraining] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [players, setPlayers] = useState([])
  const [rsvps, setRsvps] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAttendance, setShowAttendance] = useState(false)
  const [saving, setSaving] = useState(false)

  // Buffer de debounce por campo: { "location": timeoutId, "notes": timeoutId, ... }
  const debounceRef = useRef({})

  useEffect(() => { load() }, [trainingId])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: b }, { data: p }, { data: r }, { data: a }] = await Promise.all([
      supabase.from('trainings').select('*').eq('id', trainingId).single(),
      supabase.from('training_blocks').select('*').eq('training_id', trainingId).order('order_index'),
      supabase.from('players').select('*').eq('team_id', teamId).eq('active', true).order('name'),
      supabase.from('rsvps').select('*, players(name, number)').eq('training_id', trainingId),
      supabase.from('attendance').select('*').eq('training_id', trainingId),
    ])
    setTraining(t); setBlocks(b || []); setPlayers(p || []); setRsvps(r || []); setAttendance(a || [])
    setLoading(false)
  }

  // --- Cambio local inmediato + guardado con debounce ---
  function updateField(field, value) {
    // 1) actualizamos el estado local YA (para que el input responda fluido)
    setTraining(t => ({ ...t, [field]: value }))

    // 2) debounce: cancelamos el guardado anterior de este campo
    if (debounceRef.current[field]) clearTimeout(debounceRef.current[field])

    // 3) programamos el guardado a Supabase 500ms después de la última tecla
    debounceRef.current[field] = setTimeout(async () => {
      setSaving(true)
      await supabase.from('trainings').update({ [field]: value }).eq('id', trainingId)
      setSaving(false)
    }, 500)
  }

  // Guardado inmediato (para publicar/cerrar, sin debounce)
  async function saveTraining(patch) {
    setSaving(true)
    await supabase.from('trainings').update(patch).eq('id', trainingId)
    setTraining(t => ({ ...t, ...patch }))
    setSaving(false)
  }

  async function addBlock() {
    const next = blocks.length
    const { data, error } = await supabase.from('training_blocks').insert({
      training_id: trainingId, type: 'drill', title: 'Nuevo bloque', duration_min: 10, order_index: next,
    }).select().single()
    if (error) return alert(error.message)
    setBlocks([...blocks, data])
  }

  function updateBlockLocal(id, patch) {
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  function updateBlockDebounced(id, patch, fieldKey) {
    // aplicamos local al toque
    updateBlockLocal(id, patch)
    // debounce por bloque+campo
    const key = `block_${id}_${fieldKey}`
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(async () => {
      await supabase.from('training_blocks').update(patch).eq('id', id)
    }, 500)
  }

  async function removeBlock(id) {
    if (!confirm('¿Eliminar bloque?')) return
    await supabase.from('training_blocks').delete().eq('id', id)
    setBlocks(blocks.filter(b => b.id !== id))
  }

  async function moveBlock(id, dir) {
    const idx = blocks.findIndex(b => b.id === id)
    const swap = idx + dir
    if (swap < 0 || swap >= blocks.length) return
    const a = blocks[idx], b = blocks[swap]
    setBlocks(bs => { const c = [...bs]; c[idx] = b; c[swap] = a; return c })
    await Promise.all([
      supabase.from('training_blocks').update({ order_index: swap }).eq('id', a.id),
      supabase.from('training_blocks').update({ order_index: idx }).eq('id', b.id),
    ])
  }

  async function markAttendance(playerId, status) {
    const existing = attendance.find(a => a.player_id === playerId)
    if (existing) {
      await supabase.from('attendance').update({ status }).eq('id', existing.id)
      setAttendance(as => as.map(a => a.player_id === playerId ? { ...a, status } : a))
    } else {
      const { data } = await supabase.from('attendance').insert({
        training_id: trainingId, player_id: playerId, status,
      }).select().single()
      if (data) setAttendance(as => [...as, data])
    }
  }

  async function publish() {
    if (blocks.length === 0) return alert('Agregá al menos un bloque antes de publicar')
    await saveTraining({ status: 'published' })
    alert('Entrenamiento publicado ✅ El equipo ya lo puede ver')
  }

  if (loading) return <div className="p-6 text-slate-400">Cargando…</div>
  if (!training) return <div className="p-6 text-red-400">Entrenamiento no encontrado</div>

  const totalMin = blocks.reduce((s, b) => s + (b.duration_min || 0), 0)
  const yesCount = rsvps.filter(r => r.status === 'yes').length

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => nav(`/coach/team/${teamId}`)} className="text-sm text-slate-400 hover:text-slate-200">← Volver al equipo</button>
        {saving && <span className="text-xs text-emerald-400">Guardando…</span>}
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Entrenamiento</h1>
        <span className={`text-xs px-3 py-1 rounded-full ${
          training.status === 'published' ? 'bg-emerald-900 text-emerald-300' :
          training.status === 'done' ? 'bg-slate-700 text-slate-300' :
          'bg-amber-900 text-amber-300'
        }`}>{training.status}</span>
      </div>

      {/* Datos generales */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500">Fecha</label>
            <input
              type="date" value={training.date || ''}
              onChange={e => updateField('date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Hora inicio</label>
            <input
              type="time" value={training.start_time?.slice(0,5) || ''}
              onChange={e => updateField('start_time', e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">Lugar</label>
          <input
            type="text" placeholder="Cancha, dirección…" value={training.location || ''}
            onChange={e => updateField('location', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Notas</label>
          <textarea
            placeholder="Objetivo del entrenamiento, aclaraciones…" rows={2}
            value={training.notes || ''}
            onChange={e => updateField('notes', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
          />
        </div>
      </div>

      {/* Bloques */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Bloques ({blocks.length})</h2>
          <span className="text-xs text-slate-400">Total: {totalMin} min</span>
        </div>

        {blocks.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">Todavía no hay bloques. Agregá el primero.</p>
        )}

        {blocks.map((b, idx) => (
          <div key={b.id} className="border border-slate-800 rounded-lg p-3 space-y-2 bg-slate-950">
            <div className="flex items-center gap-2">
              <select
                value={b.type}
                onChange={e => updateBlockDebounced(b.id, { type: e.target.value }, 'type')}
                className="px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
              >
                {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                type="number" min={0} value={b.duration_min}
                onChange={e => updateBlockDebounced(b.id, { duration_min: parseInt(e.target.value) || 0 }, 'duration')}
                className="w-20 px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
              />
              <span className="text-xs text-slate-500">min</span>
              <div className="ml-auto flex gap-1">
                <button onClick={() => moveBlock(b.id, -1)} disabled={idx === 0} className="px-2 py-1 text-xs bg-slate-800 rounded disabled:opacity-30">↑</button>
                <button onClick={() => moveBlock(b.id, 1)} disabled={idx === blocks.length - 1} className="px-2 py-1 text-xs bg-slate-800 rounded disabled:opacity-30">↓</button>
                <button onClick={() => removeBlock(b.id)} className="px-2 py-1 text-xs bg-rose-900 text-rose-300 rounded">✕</button>
              </div>
            </div>
            <input
              type="text" placeholder="Título del bloque" value={b.title}
              onChange={e => updateBlockDebounced(b.id, { title: e.target.value }, 'title')}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm font-medium"
            />
            <textarea
              placeholder="Descripción / drills concretos…" rows={2} value={b.description || ''}
              onChange={e => updateBlockDebounced(b.id, { description: e.target.value }, 'description')}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
            />
          </div>
        ))}

        <button onClick={addBlock} className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium">
          + Agregar bloque
        </button>
      </div>

      {/* Publicar */}
      {training.status === 'draft' && (
        <button onClick={publish} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">
          Publicar para el equipo
        </button>
      )}

      {/* RSVPs */}
      {training.status !== 'draft' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Confirmaciones</h2>
            <span className="text-sm text-emerald-400">{yesCount} / {players.length} van</span>
          </div>
          <div className="space-y-1 text-sm">
            {players.map(p => {
              const r = rsvps.find(r => r.player_id === p.id)
              const label = !r ? '—' : r.status === 'yes' ? '✅' : r.status === 'maybe' ? '❔' : '❌'
              return (
                <div key={p.id} className="flex justify-between">
                  <span>{p.number && `#${p.number} `}{p.name}</span>
                  <span>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Asistencia real */}
      {training.status !== 'draft' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <button
            onClick={() => setShowAttendance(s => !s)}
            className="w-full flex items-center justify-between font-semibold"
          >
            <span>Marcar asistencia</span>
            <span className="text-slate-400">{showAttendance ? '▲' : '▼'}</span>
          </button>
          {showAttendance && (
            <div className="space-y-2">
              {players.map(p => {
                const a = attendance.find(a => a.player_id === p.id)
                const status = a?.status
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm">{p.number && `#${p.number} `}{p.name}</span>
                    <div className="flex gap-1">
                      {[
                        { v: 'present', l: '✅' },
                        { v: 'late',    l: '🕐' },
                        { v: 'absent',  l: '❌' },
                        { v: 'injured', l: '🤕' },
                      ].map(opt => (
                        <button
                          key={opt.v}
                          onClick={() => markAttendance(p.id, opt.v)}
                          className={`px-2 py-1 rounded text-sm ${status === opt.v ? 'bg-emerald-600' : 'bg-slate-800'}`}
                        >{opt.l}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => saveTraining({ status: 'done' })}
                className="w-full mt-2 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium"
              >
                Cerrar entrenamiento (marcar como realizado)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}