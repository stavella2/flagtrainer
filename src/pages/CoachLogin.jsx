import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CoachLogin() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setMsg('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message)
      else nav('/coach')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMsg(error.message)
      else setMsg('Cuenta creada. Revisá tu email si pediste confirmación, o iniciá sesión.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-800">
        <h1 className="text-2xl font-bold text-center">🏈 FlagTrainer</h1>
        <p className="text-sm text-slate-400 text-center">
          {mode === 'login' ? 'Ingresá como coach' : 'Crear cuenta de coach'}
        </p>
        <input
          type="email" required placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500"
        />
        <input
          type="password" required placeholder="Contraseña" minLength={6}
          value={password} onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500"
        />
        {msg && <p className="text-sm text-amber-400">{msg}</p>}
        <button disabled={loading} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50">
          {loading ? '...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="w-full text-sm text-slate-400 hover:text-slate-200">
          {mode === 'login' ? '¿No tenés cuenta? Crear una' : '¿Ya tenés cuenta? Ingresar'}
        </button>
      </form>
    </div>
  )
}