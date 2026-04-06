import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Search, Plus, Trash2, MapPin, User, Building2, Phone, Mail, Globe, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ResellerContact } from '../types'
import { v4 as uuid } from 'uuid'

// ─── helpers ─────────────────────────────────────────────────────────────────
function cleanCnpj(v: string) { return v.replace(/\D/g, '') }
function maskCnpj(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}
function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

const EMPTY_CONTACT: Omit<ResellerContact, 'id'> = { name: '', role: '', phone: '', email: '' }

export default function ResellerFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { resellers, addReseller, updateReseller } = useApp()
  const isEdit = !!id
  const existing = resellers.find(r => r.id === id)

  // ── estado principal ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    cnpj: '', razaoSocial: '', nomeFantasia: '', ie: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    telefone: '', email: '', site: '',
    observacoes: '', status: 'active' as 'active' | 'inactive',
  })
  const [contacts, setContacts] = useState<ResellerContact[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)
  const [cnpjMsg, setCnpjMsg] = useState('')

  // ── preenche ao editar ────────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        cnpj: existing.cnpj ?? '',
        razaoSocial: existing.razaoSocial ?? '',
        nomeFantasia: existing.nomeFantasia ?? '',
        ie: existing.ie ?? '',
        cep: existing.cep ?? '',
        logradouro: existing.logradouro ?? '',
        numero: existing.numero ?? '',
        complemento: existing.complemento ?? '',
        bairro: existing.bairro ?? '',
        cidade: existing.cidade ?? '',
        estado: existing.estado ?? '',
        telefone: existing.telefone ?? existing.phone ?? '',
        email: existing.email ?? '',
        site: existing.site ?? '',
        observacoes: existing.observacoes ?? '',
        status: existing.status ?? 'active',
      })
      setContacts(existing.contacts ?? [])
    }
  }, [isEdit, existing])

  // ── busca CNPJ ────────────────────────────────────────────────────────────
  async function handleCnpjSearch() {
    const cnpj = cleanCnpj(form.cnpj)
    if (cnpj.length !== 14) { setCnpjMsg('CNPJ deve ter 14 dígitos.'); return }
    setLoadingCnpj(true)
    setCnpjMsg('')
    try {
      const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`)
      const data = await res.json()
      if (data.status === 'ERROR') { setCnpjMsg('CNPJ não encontrado.'); return }
      setForm(p => ({
        ...p,
        razaoSocial: data.nome ?? p.razaoSocial,
        nomeFantasia: data.fantasia ?? p.nomeFantasia,
        telefone: p.telefone || maskPhone(data.telefone ?? ''),
        email: p.email || (data.email ?? ''),
        cep: p.cep || maskCep(data.cep ?? ''),
        logradouro: p.logradouro || (data.logradouro ?? ''),
        numero: p.numero || (data.numero ?? ''),
        complemento: p.complemento || (data.complemento ?? ''),
        bairro: p.bairro || (data.bairro ?? ''),
        cidade: p.cidade || (data.municipio ?? ''),
        estado: p.estado || (data.uf ?? ''),
      }))
      setCnpjMsg('✓ Dados preenchidos com sucesso!')
    } catch {
      setCnpjMsg('Erro ao consultar CNPJ. Tente novamente.')
    } finally {
      setLoadingCnpj(false)
    }
  }

  // ── busca CEP ─────────────────────────────────────────────────────────────
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
          cidade: data.localidade ?? p.cidade,
          estado: data.uf ?? p.estado,
        }))
      }
    } catch { /* silently fail */ }
    finally { setLoadingCep(false) }
  }

  // ── responsáveis ─────────────────────────────────────────────────────────
  function addContact() {
    setContacts(prev => [...prev, { ...EMPTY_CONTACT, id: uuid() }])
  }
  function updateContact(cid: string, field: keyof ResellerContact, value: string) {
    setContacts(prev => prev.map(c => c.id === cid ? { ...c, [field]: value } : c))
  }
  function removeContact(cid: string) {
    setContacts(prev => prev.filter(c => c.id !== cid))
  }

  // ── submit ────────────────────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {}
    const displayName = form.nomeFantasia.trim() || form.razaoSocial.trim()
    if (!displayName) e.nomeFantasia = 'Informe ao menos o Nome Fantasia ou a Razão Social.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido.'
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const displayName = form.nomeFantasia.trim() || form.razaoSocial.trim()
    const payload = {
      name: displayName,
      cnpj: form.cnpj || undefined,
      razaoSocial: form.razaoSocial || undefined,
      nomeFantasia: form.nomeFantasia || undefined,
      ie: form.ie || undefined,
      cep: form.cep || undefined,
      logradouro: form.logradouro || undefined,
      numero: form.numero || undefined,
      complemento: form.complemento || undefined,
      bairro: form.bairro || undefined,
      cidade: form.cidade || undefined,
      estado: form.estado || undefined,
      telefone: form.telefone || undefined,
      phone: form.telefone || undefined,
      email: form.email || undefined,
      site: form.site || undefined,
      observacoes: form.observacoes || undefined,
      status: form.status,
      contacts,
    }

    if (isEdit && existing) updateReseller(id, payload)
    else addReseller(payload)
    navigate('/resellers')
  }

  // ── estilos ───────────────────────────────────────────────────────────────
  const inp = (err?: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-white ${err ? 'border-red-400' : 'border-gray-200'}`
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'
  const section = 'bg-white rounded-2xl border p-6 flex flex-col gap-4'
  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div className="flex items-center gap-2 mb-1 pb-3 border-b">
      <span className="text-brand" style={{ color: 'var(--color-primary)' }}>{icon}</span>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/resellers')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" aria-label="Voltar">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{isEdit ? 'Editar Revendedor' : 'Novo Revendedor'}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isEdit ? 'Atualize os dados do revendedor.' : 'Preencha os dados para cadastrar um novo revendedor.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Dados Jurídicos ── */}
        <div className={section}>
          {sectionTitle(<Building2 className="w-4 h-4" />, 'Dados Jurídicos')}

          {/* CNPJ + busca */}
          <div>
            <label className={lbl}>CNPJ</label>
            <div className="flex gap-2">
              <input
                className={inp() + ' flex-1'}
                value={form.cnpj}
                onChange={e => setForm(p => ({ ...p, cnpj: maskCnpj(e.target.value) }))}
                placeholder="00.000.000/0001-00"
                maxLength={18}
              />
              <button type="button" onClick={handleCnpjSearch} disabled={loadingCnpj}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}>
                {loadingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
            {cnpjMsg && (
              <p className={`text-xs mt-1 ${cnpjMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{cnpjMsg}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Razão Social</label>
              <input className={inp()} value={form.razaoSocial}
                onChange={e => setForm(p => ({ ...p, razaoSocial: e.target.value }))}
                placeholder="Nome jurídico completo" />
            </div>
            <div>
              <label className={lbl}>
                Nome Fantasia <span className="text-red-500">*</span>
              </label>
              <input className={inp(errors.nomeFantasia)} value={form.nomeFantasia}
                onChange={e => { setForm(p => ({ ...p, nomeFantasia: e.target.value })); setErrors(p => ({ ...p, nomeFantasia: '' })) }}
                placeholder="Nome comercial" />
              {errors.nomeFantasia && <p className="text-xs text-red-500 mt-1">{errors.nomeFantasia}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Inscrição Estadual (IE)</label>
              <input className={inp()} value={form.ie}
                onChange={e => setForm(p => ({ ...p, ie: e.target.value }))}
                placeholder="Ex: ISENTO ou número" />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={inp()} value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Endereço ── */}
        <div className={section}>
          {sectionTitle(<MapPin className="w-4 h-4" />, 'Endereço')}

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={lbl}>CEP</label>
              <div className="relative">
                <input className={inp() + ' pr-8'} value={form.cep}
                  onChange={e => {
                    const v = maskCep(e.target.value)
                    setForm(p => ({ ...p, cep: v }))
                    if (v.replace(/\D/g, '').length === 8) handleCepSearch(v)
                  }}
                  placeholder="00000-000" maxLength={9} />
                {loadingCep && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-gray-400" />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Logradouro</label>
              <input className={inp()} value={form.logradouro}
                onChange={e => setForm(p => ({ ...p, logradouro: e.target.value }))}
                placeholder="Rua, Av., etc." />
            </div>
            <div>
              <label className={lbl}>Número</label>
              <input className={inp()} value={form.numero}
                onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                placeholder="Ex: 123" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Complemento</label>
              <input className={inp()} value={form.complemento}
                onChange={e => setForm(p => ({ ...p, complemento: e.target.value }))}
                placeholder="Sala, Andar, etc." />
            </div>
            <div>
              <label className={lbl}>Bairro</label>
              <input className={inp()} value={form.bairro}
                onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))}
                placeholder="Bairro" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Cidade</label>
              <input className={inp()} value={form.cidade}
                onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
                placeholder="Cidade" />
            </div>
            <div>
              <label className={lbl}>UF</label>
              <input className={inp()} value={form.estado}
                onChange={e => setForm(p => ({ ...p, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                placeholder="SC" maxLength={2} />
            </div>
          </div>
        </div>

        {/* ── Contato Geral ── */}
        <div className={section}>
          {sectionTitle(<Phone className="w-4 h-4" />, 'Contato Geral')}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Telefone principal</label>
              <input className={inp()} value={form.telefone}
                onChange={e => setForm(p => ({ ...p, telefone: maskPhone(e.target.value) }))}
                placeholder="(47) 99999-0000" />
            </div>
            <div>
              <label className={lbl}>E-mail</label>
              <input type="email" className={inp(errors.email)} value={form.email}
                onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setErrors(p => ({ ...p, email: '' })) }}
                placeholder="contato@empresa.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className={lbl}>Site</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input className={inp() + ' pl-9'} value={form.site}
                onChange={e => setForm(p => ({ ...p, site: e.target.value }))}
                placeholder="https://www.empresa.com.br" />
            </div>
          </div>
        </div>

        {/* ── Responsáveis / Contatos ── */}
        <div className={section}>
          {sectionTitle(<User className="w-4 h-4" />, 'Responsáveis / Contatos')}

          {contacts.length === 0 && (
            <p className="text-sm text-gray-400 py-2">Nenhum responsável adicionado ainda.</p>
          )}

          <div className="flex flex-col gap-4">
            {contacts.map((c, idx) => (
              <div key={c.id} className="relative rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Contato {idx + 1}
                  </span>
                  <button type="button" onClick={() => removeContact(c.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1" aria-label="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Nome <span className="text-red-500">*</span></label>
                    <input className={inp()} value={c.name}
                      onChange={e => updateContact(c.id, 'name', e.target.value)}
                      placeholder="Nome completo" />
                  </div>
                  <div>
                    <label className={lbl}>Cargo / Função</label>
                    <input className={inp()} value={c.role ?? ''}
                      onChange={e => updateContact(c.id, 'role', e.target.value)}
                      placeholder="Ex: Engenheiro, Gerente..." />
                  </div>
                  <div>
                    <label className={lbl}>Telefone</label>
                    <input className={inp()} value={c.phone ?? ''}
                      onChange={e => updateContact(c.id, 'phone', maskPhone(e.target.value))}
                      placeholder="(47) 99999-0000" />
                  </div>
                  <div>
                    <label className={lbl}>E-mail</label>
                    <input type="email" className={inp()} value={c.email ?? ''}
                      onChange={e => updateContact(c.id, 'email', e.target.value)}
                      placeholder="nome@empresa.com" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addContact}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed text-sm font-medium transition-colors hover:bg-gray-50 w-full justify-center"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
            <Plus className="w-4 h-4" />
            Adicionar responsável
          </button>
        </div>

        {/* ── Observações ── */}
        <div className={section}>
          {sectionTitle(<Mail className="w-4 h-4" />, 'Observações')}
          <textarea
            className={inp() + ' resize-none'}
            rows={3}
            value={form.observacoes}
            onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
            placeholder="Informações adicionais, histórico comercial, condições especiais..."
          />
        </div>

        {/* ── Botões ── */}
        <div className="flex gap-3 pb-6">
          <button type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ background: 'var(--color-primary)' }}>
            <Save className="w-4 h-4" />
            {isEdit ? 'Salvar Alterações' : 'Cadastrar Revendedor'}
          </button>
          <button type="button" onClick={() => navigate('/resellers')}
            className="px-6 py-2.5 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>

      </form>
    </div>
  )
}