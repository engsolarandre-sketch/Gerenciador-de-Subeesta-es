import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2, Lock, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionReady(Boolean(data.session)))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
    } else {
      await supabase.auth.signOut()
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--color-primary)' }}>
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Definir nova senha</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>Crie sua senha para acessar o sistema</p>
        </div>

        <div className="rounded-lg border p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {sessionReady === null && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Validando link...</div>
          )}

          {sessionReady === false && (
            <div className="space-y-4 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
              <div>
                <p className="font-semibold text-gray-900">Link inválido ou expirado</p>
                <p className="mt-1 text-sm leading-6 text-gray-500">Solicite um novo convite ao administrador ou use “Esqueci a senha”.</p>
              </div>
              <button type="button" onClick={() => navigate('/login', { replace: true })} className="app-button-primary w-full">Voltar ao login</button>
            </div>
          )}

          {sessionReady && success && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
              <div>
                <p className="font-semibold text-gray-900">Senha definida com sucesso</p>
                <p className="mt-1 text-sm text-gray-500">Agora você já pode entrar no sistema.</p>
              </div>
              <button type="button" onClick={() => navigate('/login', { replace: true })} className="app-button-primary w-full">Ir para o login</button>
            </div>
          )}

          {sessionReady && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="app-input w-full pl-9" placeholder="Mínimo de 8 caracteres" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="app-input w-full pl-9" placeholder="Repita a nova senha" />
                </div>
              </div>
              {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
              <button type="submit" disabled={loading} className="app-button-primary w-full disabled:opacity-60">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
