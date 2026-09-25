import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Zap, Mail, Lock, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotPassword, setForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (signInError) setError('E-mail ou senha incorretos.')
    setLoading(false)
  }

  async function handlePasswordReset(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const { data, error: invokeError } = await supabase.functions.invoke('manage-users', {
      body: { action: 'request-password-reset', email: email.trim() },
    })

    if (invokeError || data?.error) {
      let errorMessage = data?.error ?? invokeError?.message ?? 'Não foi possível enviar a recuperação.'
      const context = (invokeError as { context?: Response } | null)?.context
      if (context) {
        try {
          const payload = await context.clone().json()
          if (payload?.error) errorMessage = payload.error
        } catch {
          // Mantém a mensagem disponível quando a resposta não contém JSON.
        }
      }
      setError(errorMessage)
    } else {
      setMessage(data?.message ?? 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.')
    }
    setLoading(false)
  }

  function changeMode(showForgotPassword: boolean) {
    setForgotPassword(showForgotPassword)
    setError('')
    setMessage('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--color-primary)' }}>
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Gerenciador de Subestações</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {forgotPassword ? 'Recupere o acesso à sua conta' : 'Acesse sua conta para continuar'}
          </p>
        </div>

        <div className="rounded-lg border p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {forgotPassword && (
            <button type="button" onClick={() => changeMode(false)} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800">
              <ArrowLeft size={15} /> Voltar ao login
            </button>
          )}

          <form onSubmit={forgotPassword ? handlePasswordReset : handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="w-full rounded-lg py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            {!forgotPassword && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>Senha</label>
                  <button type="button" onClick={() => changeMode(true)} className="text-xs font-semibold text-brand hover:text-brand-dark">Esqueci a senha</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-lg py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ background: 'var(--color-error-highlight)', color: 'var(--color-error)' }} role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {message && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800" role="status">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {message}
              </div>
            )}

            <button type="submit" disabled={loading || Boolean(message)} className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60" style={{ background: 'var(--color-primary)' }}>
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                : forgotPassword ? 'Enviar link de recuperação' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-text-faint)' }}>ALS Energia © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
