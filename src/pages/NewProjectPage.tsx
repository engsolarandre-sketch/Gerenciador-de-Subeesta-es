import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Button from '../components/Button'

export default function NewProjectPage() {
  const { addProject, clients, resellers, substationTypes, requestTypes } = useApp()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    substationTypeId: '',
    requestTypeId: '',
    transformerKva: '',
    concessionaria: 'CELESC',
    clientId: '',
    resellerId: '',
    startDate: new Date().toISOString().split('T')[0],
    plannedEndDate: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function getEstimatedEnd(substationTypeId: string, startDate: string): string {
    if (!substationTypeId || !startDate) return ''
    const type = substationTypes.find(t => t.id === substationTypeId)
    if (!type) return ''
    const totalDays = type.stages.reduce((acc, s) => acc + (s.defaultDurationDays ?? 0), 0)
    const end = new Date(startDate)
    end.setDate(end.getDate() + totalDays)
    return end.toISOString().split('T')[0]
  }

  function handleTypeChange(value: string) {
    const estimated = getEstimatedEnd(value, form.startDate)
    setForm(prev => ({ ...prev, substationTypeId: value, plannedEndDate: estimated }))
  }

  function handleStartDateChange(value: string) {
    const estimated = getEstimatedEnd(form.substationTypeId, value)
    setForm(prev => ({ ...prev, startDate: value, plannedEndDate: estimated }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.substationTypeId || !form.clientId || !form.resellerId) {
      alert('Preencha todos os campos obrigatórios.')
      return
    }
    const project = await addProject({
      title: form.title,
      substationTypeId: form.substationTypeId,
      requestTypeId: form.requestTypeId || undefined,
      transformerKva: form.transformerKva ? parseFloat(form.transformerKva) : undefined,
      concessionaria: form.concessionaria,
      clientId: form.clientId,
      resellerId: form.resellerId,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      plannedEndDate: form.plannedEndDate ? new Date(form.plannedEndDate).toISOString() : undefined,
    })
    navigate(`/projects/${project.id}`)
  }

  const label = 'block text-sm font-medium text-gray-700 mb-1'
  const input = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'

  const selectedType = substationTypes.find(t => t.id === form.substationTypeId)
  const totalDays = selectedType
    ? selectedType.stages.reduce((acc, s) => acc + (s.defaultDurationDays ?? 0), 0)
    : null

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Novo Projeto</h1>

      {substationTypes.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-sm text-orange-700">
          Nenhum tipo de subestação cadastrado.{' '}
          <a href="/settings" className="underline font-medium">Cadastrar em Parâmetros</a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 flex flex-col gap-4">

        {/* Título */}
        <div>
          <label className={label}>Título do Projeto *</label>
          <input className={input} value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Ex: Subestação Empresa XYZ" />
        </div>

        {/* Tipo de subestação */}
        <div>
          <label className={label}>Tipo de Subestação *</label>
          <select className={input} value={form.substationTypeId}
            onChange={e => handleTypeChange(e.target.value)}>
            <option value="">Selecione...</option>
            {substationTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {selectedType && (
            <p className="text-xs text-gray-400 mt-1">
              {selectedType.stages.length} etapas · Prazo estimado:{' '}
              <strong>{totalDays} dias</strong>
            </p>
          )}
        </div>

        {/* Tipo de Solicitação */}
        <div>
          <label className={label}>Tipo de Solicitação</label>
          <select className={input} value={form.requestTypeId}
            onChange={e => set('requestTypeId', e.target.value)}>
            <option value="">Selecione...</option>
            {requestTypes.map(rt => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>
          {requestTypes.length === 0 && (
            <p className="text-xs text-orange-400 mt-1">
              Nenhum tipo de solicitação cadastrado.{' '}
              <a href="/settings" className="underline">Cadastrar em Parâmetros</a>
            </p>
          )}
        </div>

        {/* kVA */}
        <div>
          <label className={label}>Potência do Transformador (kVA)</label>
          <input className={input} type="number" value={form.transformerKva}
            onChange={e => set('transformerKva', e.target.value)}
            placeholder="Ex: 300" />
        </div>

        {/* Concessionária */}
        <div>
          <label className={label}>Concessionária *</label>
          <select className={input} value={form.concessionaria}
            onChange={e => set('concessionaria', e.target.value)}>
            <option>CELESC</option>
          </select>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Data de Início</label>
            <input className={input} type="date" value={form.startDate}
              onChange={e => handleStartDateChange(e.target.value)} />
          </div>
          <div>
            <label className={label}>Prazo de Entrega</label>
            <input className={input} type="date" value={form.plannedEndDate}
              onChange={e => set('plannedEndDate', e.target.value)} />
            {form.plannedEndDate && form.substationTypeId && (
              <p className="text-xs text-gray-400 mt-1">Calculado pelo template</p>
            )}
          </div>
        </div>

        {/* Revendedor */}
        <div>
          <label className={label}>Revendedor *</label>
          <select className={input} value={form.resellerId}
            onChange={e => set('resellerId', e.target.value)}>
            <option value="">Selecione...</option>
            {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {resellers.length === 0 && (
            <p className="text-xs text-orange-400 mt-1">
              Nenhum revendedor.{' '}
              <a href="/resellers" className="underline">Cadastrar agora</a>
            </p>
          )}
        </div>

        {/* Cliente */}
        <div>
          <label className={label}>Cliente Final *</label>
          <select className={input} value={form.clientId}
            onChange={e => set('clientId', e.target.value)}>
            <option value="">Selecione...</option>
            {clients
              .filter(c => !form.resellerId || c.resellerId === form.resellerId)
              .map(c => <option key={c.id} value={c.id}>{c.name} — {c.cpfCnpj}</option>)}
          </select>
          {clients.length === 0 && (
            <p className="text-xs text-orange-400 mt-1">
              Nenhum cliente.{' '}
              <a href="/clients" className="underline">Cadastrar agora</a>
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit">Criar Projeto</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/projects')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
