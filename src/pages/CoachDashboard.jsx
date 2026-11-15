import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CoachDashboard() {
  const nav = useNavigate()
  const [user, setUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving, setSaving] = useState(false)

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

  async function logout() {
    await supabase.auth.signOut()
    nav('/')
  }

  // Abrir modal para CREAR
  function openCreateModal() {
    setEditingTeam(null)
    setTeamName('')
    setLogoFile(null)
    setLogoPreview(null)
    setIsModalOpen(true)
  }

  // Abrir modal para EDITAR
  function openEditModal(team) {
    setEditingTeam(team)
    setTeamName(team.name)
    setLogoFile(null)
    setLogoPreview(team.logo_url || null)
    setIsModalOpen(true)
  }

  // Manejar la selección de la imagen
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  // Guardar (Crear o Editar)
  async function handleSaveTeam(e) {
    e.preventDefault()
    if (!teamName.trim()) return
    setSaving(true)

    let finalLogoUrl = editingTeam?.logo_url || null

    // 1. Si hay una imagen nueva, la subimos a Supabase Storage
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile)
      
      if (uploadError) {
        alert('Error subiendo imagen: ' + uploadError.message)
        setSaving(false)
        return
      }

      // Obtenemos la URL pública
      const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName)
      finalLogoUrl = publicUrlData.publicUrl
    }

    // 2. Guardamos en la base de datos
    if (editingTeam) {
      // Editar
      const { error } = await supabase.from('teams').update({
        name: teamName,
        logo_url: finalLogoUrl
      }).eq('id', editingTeam.id)
      if (error) alert(error.message)
    } else {
      // Crear
      const slug = teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const { error } = await supabase.from('teams').insert({
        name: teamName,
        slug: slug + '-' + Math.floor(Math.random() * 1000), // Slug único
        coach_id: user.id,
        logo_url: finalLogoUrl
      })
      if (error) alert(error.message)
    }

    setSaving(false)
    setIsModalOpen(false)
    loadTeams()
  }

  // Eliminar equipo
  async function deleteTeam(id) {
    if (!confirm('¿Estás seguro de eliminar este equipo? Se borrarán TODOS sus jugadores, entrenamientos y estadísticas. Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) return alert(error.message)
    loadTeams()
  }

  if (loading) return <div className="p-6 text-slate-400">Cargando…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis equipos</h1>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-200">Salir</button>
      </div>

      <button 
        onClick={() => nav('/coach/templates')} 
        className="w-full py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold flex items-center justify-center gap-2"
      >
        📚 Directorio de Plantillas
      </button>

      <button onClick={openCreateModal} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">
        + Crear equipo
      </button>

      {teams.length === 0 && <p className="text-slate-400 text-center py-8">Todavía no tenés equipos.</p>}

      <div className="space-y-3">
        {teams.map(t => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-600 transition">
            {/* Logo */}
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
              {t.logo_url ? (
                <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">🏈</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 cursor-pointer" onClick={() => nav(`/coach/team/${t.id}`)}>
              <p className="font-semibold">{t.name}</p>
              <p className="text-xs text-slate-500 font-mono break-all">/t/{t.access_token}</p>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/t/${t.access_token}`)}
                className="text-xs px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 whitespace-nowrap"
                title="Copiar link para jugadores"
              >
                🔗
              </button>
              <button onClick={() => openEditModal(t)} className="text-xs px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400" title="Editar equipo">
                ✏️
              </button>
              <button onClick={() => deleteTeam(t.id)} className="text-xs px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400" title="Eliminar equipo">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE CREAR / EDITAR EQUIPO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold">{editingTeam ? 'Editar Equipo' : 'Crear Nuevo Equipo'}</h2>
            
            <form onSubmit={handleSaveTeam} className="space-y-4">
              {/* Selector de Logo */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-700 relative group cursor-pointer">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🏈</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-xs font-medium">Subir</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <p className="text-xs text-slate-500">Toca para subir un logo</p>
              </div>

              {/* Nombre del Equipo */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nombre del equipo</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: Tiburones Flag" 
                  value={teamName} 
                  onChange={e => setTeamName(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none" 
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium">
                  Cancelar
                </button>
                <button disabled={saving} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium disabled:opacity-50">
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}