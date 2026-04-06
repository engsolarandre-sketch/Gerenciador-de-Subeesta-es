import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Plus, Search, Edit, Trash2,
  Phone, Mail, ChevronRight, Copy, Check, Link
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ResellersPage() {
  const navigate = useNavigate()
  const { resellers, deleteReseller } = useApp()

  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = resellers.filter(r => {
    return (
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.phone ?? '').toLowerCase().includes(search.toLowerCase())
    )
  })

  function handleDelete(id: string) {
    if (confirm('Deseja realmente excluir este revendedor?')) {
      deleteReseller(id)
    }
  }

  function handleCopyLink(e: React.MouseEvent, resellerId: string) {
    e.stopPropagation()
    const url = `${window.location.origin}/portal/${resellerId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(resellerId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Revendedores
          </h1>
        </div>
        <button
          onClick={() => navigate('/resellers/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus className="w-4 h-4" />
          Novo Revendedor
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total de Revendedores', value: resellers.length },
          { label: 'Resultado da Busca', value: filtered.length },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
          >
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              {stat.label}
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1" style={{ color: 'var(--color-text)' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Users className="w-10 h-10 mb-3" style={{ color: 'var(--color-text-faint)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text)' }}>
            Nenhum revendedor encontrado
          </p>
          <p className="text-sm mt-1">Tente ajustar a busca ou cadastre um novo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reseller => (
            <div
              key={reseller.id}
              className="rounded-xl p-4 transition-shadow"
              style={{
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <div className="flex items-start gap-4">

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'var(--color-primary-highlight)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <span className="text-sm font-semibold">
                    {reseller.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                    {reseller.name}
                  </span>

                  <div
                    className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {reseller.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {reseller.email}
                      </span>
                    )}
                    {reseller.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {reseller.phone}
                      </span>
                    )}
                  </div>

                  {/* ── Botão copiar link do portal ── */}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={e => handleCopyLink(e, reseller.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: copiedId === reseller.id
                          ? 'var(--color-success-highlight)'
                          : 'var(--color-primary-highlight)',
                        color: copiedId === reseller.id
                          ? 'var(--color-success)'
                          : 'var(--color-primary)',
                      }}
                      title={`${window.location.origin}/portal/${reseller.id}`}
                      aria-label="Copiar link do portal do revendedor"
                    >
                      {copiedId === reseller.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Link copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar link do portal
                        </>
                      )}
                    </button>

                    {/* Preview da URL (visível só em telas maiores) */}
                    <span
                      className="text-xs truncate max-w-xs hidden sm:flex items-center gap-1"
                      style={{ color: 'var(--color-text-faint)' }}
                    >
                      <Link className="w-3 h-3 shrink-0" />
                      {window.location.origin}/portal/{reseller.id}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => navigate(`/resellers/${reseller.id}`)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label="Ver detalhes"
                    title="Ver detalhes"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/resellers/${reseller.id}/edit`)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label="Editar"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(reseller.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label="Excluir"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}