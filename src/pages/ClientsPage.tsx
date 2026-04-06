import { useState, useEffect } from 'react'
import {
  Users, Plus, Search, Edit, Trash2, Phone, Mail, MapPin,
  ChevronRight, Building2, Hash, Navigation, Loader2, User, X
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Client, ClientResponsible } from '../types'
import { v4 as uuid } from 'uuid'


// ─── helpers ──────────────────────────────────────────────────────────────────
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}
function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}
function maskCpf(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
function maskCnpj(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}


const EMPTY_FORM = {
  name: '', razaoSocial: '', nomeFantasia: '', cpfCnpj: '',
  email: '', phone: '', site: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', city: '', state: '',
  numeroUC: '', latitude: '', longitude: '',
  observacoes: '', resellerId: '',
}


const EMPTY_RESPONSIBLE: Omit<ClientResponsible, 'id'> = { name: '', role: '', email: '', cpf: '' }


// ─── Seção do formulário ──────────────────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b mb-1">
      <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
    </div>
  )
}


// ─── Componente principal ─────────────────────────────────────────────────────
export default function ClientsPage() {
  const { clients, resellers, addClient, updateClient, deleteClient, projects } = useApp()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [filterReseller, setFilterReseller] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [responsibles, setResponsibles] = useState<ClientResponsible[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingCep, setLoadingCep] = useState(false)
  const [tab, setTab] = useState<'dados' | 'endereco' | 'responsaveis'>('dados')


  function setF(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: '' }))
  }


  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setResponsibles([])
    setErrors({})
    setTab('dados')
    setOpen(true)
  }
  function openEdit(c: Client) {
    setEditing(c)
    setForm({
      name: c.name, razaoSocial: c.razaoSocial ?? '', nomeFantasia: c.nomeFantasia ?? '',
      cpfCnpj: c.cpfCnpj,
      email: c.email ?? '', phone: c.phone ?? '', site: c.site ?? '',
      cep: c.cep ?? '', logradouro: c.logradouro ?? '', numero: c.numero ?? '',
      complemento: c.complemento ?? '', bairro: c.bairro ?? '',
      city: c.city ?? '', state: c.state ?? '',
      numeroUC: c.numeroUC ?? '', latitude: c.latitude ?? '', longitude: c.longitude ?? '',
      observacoes: c.observacoes ?? '', resellerId: c.resellerId,
    })
    setResponsibles(c.responsibles ?? [])
    setErrors({})
    setTab('dados')
    setOpen(true)
  }


  // ── ViaCEP ──────────────────────────────────────────────────────────────────
  async function handleCepSearch(cep: string) {
    const c = cep.replace(/\D/g, '')
    if (c.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${c}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(p => ({
          ...p,
          logradouro: data.logradouro ?? p.logradouro,
          bairro: data.bairro ?? p.bairro,
          city: data.localidade ?? p.city,
          state: data.uf ?? p.state,
        }))
      }
    } catch { /* silently fail */ }
    finally { setLoadingCep(false) }
  }


  // ── Responsáveis ────────────────────────────────────────────────────────────
  function addResponsible() {
    setResponsibles(prev => [...prev, { ...EMPTY_RESPONSIBLE, id: uuid() }])
  }
  function updateResponsible(rid: string, field: keyof ClientResponsible, value: string) {
    setResponsibles(prev => prev.map(r => r.id === rid ? { ...r, [field]: value } : r))
  }
  function removeResponsible(rid: string) {
    setResponsibles(prev => prev.filter(r => r.id !== rid))
  }


  // ── Submit ──────────────────────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim() && !form.razaoSocial.trim() && !form.nomeFantasia.trim())
      e.name = 'Informe ao menos o nome, razão social ou nome fantasia.'
    if (!form.cpfCnpj.trim()) e.cpfCnpj = 'CPF/CNPJ é obrigatório.'
    if (!form.resellerId) e.resellerId = 'Selecione o revendedor.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido.'
    return e
  }


  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); setTab('dados'); return }

    const displayName = form.nomeFantasia.trim() || form.razaoSocial.trim() || form.name.trim()
    const payload = {
      name: displayName,
      razaoSocial: form.razaoSocial || undefined,
      nomeFantasia: form.nomeFantasia || undefined,
      cpfCnpj: form.cpfCnpj,
      email: form.email || undefined,
      phone: form.phone || undefined,
      site: form.site || undefined,
      cep: form.cep || undefined,
      logradouro: form.logradouro || undefined,
      numero: form.numero || undefined,
      complemento: form.complemento || undefined,
      bairro: form.bairro || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      address: form.logradouro ? `${form.logradouro}${form.numero ? ', ' + form.numero : ''}` : undefined,
      numeroUC: form.numeroUC || undefined,
      latitude: form.latitude || undefined,
      longitude: form.longitude || undefined,
      observacoes: form.observacoes || undefined,
      responsibles,
      resellerId: form.resellerId,
    }

    if (editing) updateClient(editing.id, payload)
    else addClient(payload)
    setOpen(false)
  }


  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.cpfCnpj.includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q) ||
      (c.numeroUC ?? '').includes(q)
    const matchReseller = !filterReseller || c.resellerId === filterReseller
    return matchSearch && matchReseller
  })


  const totalProjects  = (cid: string) => projects.filter(p => p.clientId === cid).length
  const activeProjects = (cid: string) =>
    projects.filter(p => p.clientId === cid && p.status === 'IN_PROGRESS').length


  const inp = (err?: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-white ${err ? 'border-red-400' : 'border-gray-200'}`
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'


  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Clientes</h1>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--color-primary)' }}>
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de Clientes',   value: clients.length },
          { label: 'Resultado da Busca',  value: filtered.length },
          { label: 'Com Projetos Ativos', value: clients.filter(c => activeProjects(c.id) > 0).length },
          { label: 'Revendedores',        value: resellers.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
            <p className="text-2xl font-semibold tabular-nums mt-1" style={{ color: 'var(--color-text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Buscar por nome, CPF/CNPJ, e-mail, cidade, nº UC..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
        </div>
        <select value={filterReseller} onChange={e => setFilterReseller(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
          <option value="">Todos os revendedores</option>
          {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* ── Lista ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Users className="w-10 h-10 mb-3" style={{ color: 'var(--color-text-faint)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text)' }}>Nenhum cliente encontrado</p>
          <p className="text-sm mt-1">Tente ajustar a busca ou cadastre um novo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const reseller = resellers.find(r => r.id === c.resellerId)
            const total  = totalProjects(c.id)
            const active = activeProjects(c.id)
            return (
              <div key={c.id} className="rounded-xl p-4 transition-shadow hover:shadow-md"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <div className="flex items-start gap-4">

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                    style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" style={{ color: 'var(--color-text)' }}>{c.name}</span>
                      {c.razaoSocial && c.razaoSocial !== c.name && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>
                          {c.razaoSocial}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span>{c.cpfCnpj}</span>
                      {c.email  && <span className="flex items-center gap-1"><Mail  className="w-3 h-3" />{c.email}</span>}
                      {c.phone  && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {(c.city || c.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{[c.city, c.state].filter(Boolean).join(' – ')}
                        </span>
                      )}
                      {c.numeroUC && (
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />UC: {c.numeroUC}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {reseller && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>
                          {reseller.name}
                        </span>
                      )}
                      {total > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>
                          {total} projeto{total > 1 ? 's' : ''}
                          {active > 0 && <span style={{ color: 'var(--color-success)' }}> · {active} ativo{active > 1 ? 's' : ''}</span>}
                        </span>
                      )}
                      {(c.responsibles?.length ?? 0) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>
                          {c.responsibles.length} responsável{c.responsibles.length > 1 ? 'eis' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(c)}
                      className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                      style={{ color: 'var(--color-text-muted)' }} aria-label="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (confirm(`Excluir cliente ${c.name}?`)) deleteClient(c.id) }}
                      className="p-2 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                      style={{ color: 'var(--color-text-muted)' }} aria-label="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — tamanho reduzido
      ══════════════════════════════════════════════════════════════════════ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'oklch(0 0 0 / 0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[82vh] flex flex-col">

            {/* Header do modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h2 className="text-base font-semibold text-gray-800">
                {editing ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b shrink-0 px-5">
              {([
                { key: 'dados',        label: 'Dados' },
                { key: 'endereco',     label: 'Endereço' },
                { key: 'responsaveis', label: `Responsáveis${responsibles.length > 0 ? ` (${responsibles.length})` : ''}` },
              ] as { key: typeof tab; label: string }[]).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={tab === t.key ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Conteúdo scrollável */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* ── ABA: DADOS ── */}
                {tab === 'dados' && (
                  <>
                    <div>
                      <SectionTitle icon={<Building2 className="w-4 h-4" />} title="Identificação" />
                      <div className="space-y-3 mt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={lbl}>Nome Fantasia</label>
                            <input className={inp(errors.name)} value={form.nomeFantasia}
                              onChange={e => setF('nomeFantasia', e.target.value)}
                              placeholder="Nome comercial" />
                          </div>
                          <div>
                            <label className={lbl}>Razão Social</label>
                            <input className={inp()} value={form.razaoSocial}
                              onChange={e => setF('razaoSocial', e.target.value)}
                              placeholder="Nome jurídico" />
                          </div>
                        </div>
                        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={lbl}>CPF / CNPJ <span className="text-red-500">*</span></label>
                            <input className={inp(errors.cpfCnpj)} value={form.cpfCnpj}
                              onChange={e => {
                                const v = e.target.value.replace(/\D/g, '')
                                setF('cpfCnpj', v.length <= 11 ? maskCpf(v) : maskCnpj(v))
                              }}
                              placeholder="000.000.000-00 ou CNPJ" />
                            {errors.cpfCnpj && <p className="text-xs text-red-500 mt-1">{errors.cpfCnpj}</p>}
                          </div>
                          <div>
                            <label className={lbl}>Nº da UC</label>
                            <input className={inp()} value={form.numeroUC}
                              onChange={e => setF('numeroUC', e.target.value)}
                              placeholder="Ex: 1234567" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <SectionTitle icon={<Mail className="w-4 h-4" />} title="Contato" />
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className={lbl}>E-mail</label>
                          <input type="email" className={inp(errors.email)} value={form.email}
                            onChange={e => setF('email', e.target.value)}
                            placeholder="contato@email.com" />
                          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                        </div>
                        <div>
                          <label className={lbl}>Telefone</label>
                          <input className={inp()} value={form.phone}
                            onChange={e => setF('phone', maskPhone(e.target.value))}
                            placeholder="(47) 99999-0000" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <SectionTitle icon={<Navigation className="w-4 h-4" />} title="Coordenadas Geográficas" />
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className={lbl}>Latitude</label>
                          <input className={inp()} value={form.latitude}
                            onChange={e => setF('latitude', e.target.value)}
                            placeholder="-26.4617" />
                        </div>
                        <div>
                          <label className={lbl}>Longitude</label>
                          <input className={inp()} value={form.longitude}
                            onChange={e => setF('longitude', e.target.value)}
                            placeholder="-49.0628" />
                        </div>
                      </div>
                      {form.latitude && form.longitude && (
                        <a href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs mt-2 underline"
                          style={{ color: 'var(--color-primary)' }}>
                          <MapPin className="w-3 h-3" /> Ver no Google Maps
                        </a>
                      )}
                    </div>

                    <div>
                      <SectionTitle icon={<Users className="w-4 h-4" />} title="Vínculo" />
                      <div className="mt-3">
                        <label className={lbl}>Revendedor <span className="text-red-500">*</span></label>
                        <select className={inp(errors.resellerId)} value={form.resellerId}
                          onChange={e => setF('resellerId', e.target.value)}>
                          <option value="">Selecione...</option>
                          {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        {errors.resellerId && <p className="text-xs text-red-500 mt-1">{errors.resellerId}</p>}
                      </div>
                    </div>

                    <div>
                      <label className={lbl}>Observações</label>
                      <textarea className={inp() + ' resize-none'} rows={2}
                        value={form.observacoes} onChange={e => setF('observacoes', e.target.value)}
                        placeholder="Informações adicionais..." />
                    </div>
                  </>
                )}

                {/* ── ABA: ENDEREÇO ── */}
                {tab === 'endereco' && (
                  <div className="space-y-3">
                    <div>
                      <label className={lbl}>CEP</label>
                      <div className="relative">
                        <input className={inp() + ' pr-8'} value={form.cep}
                          onChange={e => {
                            const v = maskCep(e.target.value)
                            setF('cep', v)
                            if (v.replace(/\D/g, '').length === 8) handleCepSearch(v)
                          }}
                          placeholder="00000-000" maxLength={9} />
                        {loadingCep && (
                          <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Preenchimento automático ao digitar o CEP</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className={lbl}>Logradouro</label>
                        <input className={inp()} value={form.logradouro}
                          onChange={e => setF('logradouro', e.target.value)}
                          placeholder="Rua, Av., etc." />
                      </div>
                      <div>
                        <label className={lbl}>Número</label>
                        <input className={inp()} value={form.numero}
                          onChange={e => setF('numero', e.target.value)}
                          placeholder="123" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Complemento</label>
                        <input className={inp()} value={form.complemento}
                          onChange={e => setF('complemento', e.target.value)}
                          placeholder="Sala, Bloco..." />
                      </div>
                      <div>
                        <label className={lbl}>Bairro</label>
                        <input className={inp()} value={form.bairro}
                          onChange={e => setF('bairro', e.target.value)}
                          placeholder="Bairro" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className={lbl}>Cidade</label>
                        <input className={inp()} value={form.city}
                          onChange={e => setF('city', e.target.value)}
                          placeholder="Cidade" />
                      </div>
                      <div>
                        <label className={lbl}>UF</label>
                        <input className={inp()} value={form.state}
                          onChange={e => setF('state', e.target.value.toUpperCase().slice(0, 2))}
                          placeholder="SC" maxLength={2} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ABA: RESPONSÁVEIS ── */}
                {tab === 'responsaveis' && (
                  <div className="space-y-4">
                    {responsibles.length === 0 && (
                      <p className="text-sm text-gray-400 py-2">Nenhum responsável legal adicionado.</p>
                    )}
                    {responsibles.map((r, idx) => (
                      <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Responsável {idx + 1}
                          </span>
                          <button type="button" onClick={() => removeResponsible(r.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={lbl}>Nome <span className="text-red-500">*</span></label>
                            <input className={inp()} value={r.name}
                              onChange={e => updateResponsible(r.id, 'name', e.target.value)}
                              placeholder="Nome completo" />
                          </div>
                          <div>
                            <label className={lbl}>Cargo / Função</label>
                            <input className={inp()} value={r.role ?? ''}
                              onChange={e => updateResponsible(r.id, 'role', e.target.value)}
                              placeholder="Ex: Proprietário, Diretor..." />
                          </div>
                          <div>
                            <label className={lbl}>E-mail</label>
                            <input type="email" className={inp()} value={r.email ?? ''}
                              onChange={e => updateResponsible(r.id, 'email', e.target.value)}
                              placeholder="nome@email.com" />
                          </div>
                          <div>
                            <label className={lbl}>CPF</label>
                            <input className={inp()} value={r.cpf ?? ''}
                              onChange={e => updateResponsible(r.id, 'cpf', maskCpf(e.target.value))}
                              placeholder="000.000.000-00" />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={addResponsible}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed text-sm font-medium w-full justify-center transition-colors hover:bg-gray-50"
                      style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                      <Plus className="w-4 h-4" /> Adicionar responsável legal
                    </button>
                  </div>
                )}
              </div>

              {/* Footer fixo */}
              <div className="flex gap-3 px-5 py-3 border-t bg-gray-50 rounded-b-2xl shrink-0">
                <button type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-primary)' }}>
                  {editing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
                <button type="button" onClick={() => setOpen(false)}
                  className="px-5 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
