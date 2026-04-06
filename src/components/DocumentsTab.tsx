import { useState } from 'react'
import { FileText, Download, Send, Eye, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { buildDocumentData, downloadAsPdf, downloadAsDocx } from '../utils/documentUtils'
import { REQUEST_TYPE_LABELS } from '../types'

interface Props {
  project: Record<string, unknown>
  client: Record<string, unknown> | undefined
  substationType: { name: string } | undefined
}

export default function DocumentsTab({ project, client, substationType }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [signatureSent, setSignatureSent] = useState(false)

  const code     = String(project.requestTypeId ?? '')
  const typeName = REQUEST_TYPE_LABELS[code as keyof typeof REQUEST_TYPE_LABELS]

  if (!code || !typeName) {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-16">
        <AlertCircle size={32} className="mb-3 text-gray-300" />
        <p className="font-medium text-gray-600 text-sm">Tipo de solicitação não definido</p>
        <p className="text-xs mt-1 text-center max-w-xs text-gray-400">
          Edite o projeto e selecione o <strong>Tipo de Solicitação</strong> para gerar documentos.
        </p>
      </div>
    )
  }

  const docData = buildDocumentData(project, client, substationType)
  const slug    = `${typeName}-${String(client?.name ?? 'cliente')}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()

  const missing: string[] = []
  if (!client?.name)           missing.push('Nome do cliente')
  if (!client?.cpfCnpj)        missing.push('CPF / CNPJ')
  if (!project.ucNumber)       missing.push('Nº da UC')
  if (!project.concessionaria) missing.push('Concessionária')

  return (
    <div className="p-6 space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <FileText size={17} className="text-brand shrink-0" />
        <div>
          <p className="font-semibold text-gray-800 text-sm">{typeName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Formulário preenchido automaticamente com os dados do projeto.
          </p>
        </div>
      </div>

      {/* Campos incompletos */}
      {missing.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2.5">
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-800">
              Campos em branco — documento gerado com lacunas
            </p>
            <p className="text-xs text-amber-600 mt-0.5">{missing.join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Preview inline */}
      {previewOpen && (
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pré-visualização
            </span>
            <button
              onClick={() => setPreviewOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
              aria-label="Fechar preview"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-5 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-bold text-center border-b pb-2 mb-4 text-gray-900">
              {docData.title}
            </h3>
            {docData.sections.map((sec, i) => (
              <div key={i} className="mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1.5 rounded mb-1">
                  {sec.heading}
                </div>
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {sec.rows.map((row, j) => (
                      <tr key={j} className="border-b border-gray-50">
                        <td className="py-1.5 pr-3 text-gray-400 font-medium w-44">{row.label}</td>
                        <td className={`py-1.5 ${row.value === '_______________' ? 'text-amber-400 italic' : 'text-gray-800'}`}>
                          {row.value === '_______________' ? '(não preenchido)' : row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div className="flex gap-8 mt-5 pt-4 border-t">
              {['Assinatura do Solicitante', 'Responsável Técnico', 'Concessionária'].map(s => (
                <div key={s} className="flex-1 border-t border-gray-400 pt-1.5 text-center text-xs text-gray-400">{s}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          onClick={() => setPreviewOpen(v => !v)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Eye size={15} />
          {previewOpen ? 'Fechar Preview' : 'Pré-visualizar'}
        </button>

        <button
          onClick={() => downloadAsDocx(docData, slug)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Download size={15} />
          Baixar Word (.doc)
        </button>

        <button
          onClick={() => downloadAsPdf(docData)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <Download size={15} />
          Baixar PDF
        </button>
      </div>

      {/* Assinatura digital — stand-by */}
      <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">Enviar para Assinatura Digital</p>
            <p className="text-xs text-gray-400 mt-0.5">
              DocuSign, D4Sign ou similar — integração disponível em breve.
            </p>
          </div>
          <button
            onClick={() => { setSignatureSent(true); setTimeout(() => setSignatureSent(false), 3000) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all shrink-0 ${
              signatureSent
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
            title="Em desenvolvimento"
          >
            {signatureSent
              ? <><CheckCircle2 size={13} /> Simulado!</>
              : <><Send size={13} /> Em breve</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}