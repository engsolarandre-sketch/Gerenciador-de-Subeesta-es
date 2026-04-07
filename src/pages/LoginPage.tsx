import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Zap, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError('E-mail ou senha incorretos.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-bg)' }}>

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'var(--color-primary)' }}>
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Gerenciador de Subestações
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Acesse sua conta para continuarjjjjjj
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus placeholder="seu@email.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                  }} />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                  }} />
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--color-error-highlight)', color: 'var(--color-error)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Botão */}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                : 'Entrar'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-faint)' }}>
          ALS Energia © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
