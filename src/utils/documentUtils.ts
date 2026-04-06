import { STAGE_STATUS_LABELS, STATUS_LABELS } from '../types'

// ── Tipos internos ─────────────────────────────────────────────────────────

export interface DocRow     { label: string; value: string }
export interface DocSection { heading: string; rows: DocRow[] }
export interface DocumentData { title: string; sections: DocSection[] }

// ── Labels locais (não exportados do types) ────────────────────────────────

const REQUEST_TYPE_LABELS: Record<string, string> = {
  CONNECTION_NEW:      'Ligação Nova MT',
  STANDARD_ADEQUACY:   'Alteração/Adequação de Subestação',
  DEMAND_CHANGE:       'Aumento de Demanda',
  OWNERSHIP_TRANSFER:  'Troca de Titularidade MT',
  SCHEDULED_SHUTDOWN:  'Desligamento Programado',
}

const CLIENT_CLASS_LABELS: Record<string, string> = {
  COMMERCIAL:  'Comercial',
  INDUSTRIAL:  'Industrial',
  RURAL:       'Rural',
  RESIDENTIAL: 'Residencial',
  PUBLIC:      'Poder Público',
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  OVERHEAD:     'Aérea',
  UNDERGROUND:  'Subterrânea',
}

// ── Helpers ────────────────────────────────────────────────────────────────

const BLANK = '_______________'

function fmt(val: unknown, fallback = BLANK): string {
  if (val === undefined || val === null || val === '') return fallback
  return String(val)
}

function fmtDate(iso?: string, fallback = '___/___/______'): string {
  if (!iso) return fallback
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch {
    return fallback
  }
}

// ── Construtor principal ───────────────────────────────────────────────────

export function buildDocumentData(
  project: Record<string, unknown>,
  client: Record<string, unknown> | undefined,
  substationType: { name: string } | undefined,
): DocumentData {
  const code     = String(project.requestTypeId ?? '')
  const typeName = REQUEST_TYPE_LABELS[code] ?? 'Solicitação'

  const clientSection: DocSection = {
    heading: 'Dados do Solicitante / Cliente',
    rows: [
      { label: 'Nome / Razão Social', value: fmt(client?.name) },
      { label: 'CPF / CNPJ',          value: fmt(client?.cpfCnpj) },
      { label: 'Endereço',             value: fmt(client?.street ? `${client.street}, ${client.streetNumber ?? 's/n'}` : undefined) },
      { label: 'Bairro',               value: fmt(client?.neighborhood) },
      { label: 'CEP',                  value: fmt(client?.zipCode) },
      { label: 'Município / UF',       value: client?.city ? `${client.city} / ${client.state}` : BLANK },
      { label: 'Telefone',             value: fmt(client?.phone) },
      { label: 'E-mail',               value: fmt(client?.email) },
    ],
  }

  const projectSection: DocSection = {
    heading: 'Dados do Projeto',
    rows: [
      { label: 'Tipo de Subestação',  value: fmt(substationType?.name) },
      { label: 'Tipo de Solicitação', value: typeName },
      { label: 'Concessionária',      value: fmt(project.concessionaria) },
      { label: 'Nº da UC',            value: fmt(project.ucNumber) },
      { label: 'Potência Trafo',      value: project.transformerKva ? `${project.transformerKva} kVA` : BLANK },
    ],
  }

  const specificSection = buildSpecificSection(project)

  const techSection: DocSection = {
    heading: 'Responsável Técnico',
    rows: [
      { label: 'Engenheiro',        value: fmt(project.technicalManager) },
      { label: 'CREA',              value: fmt(project.crea) },
      { label: 'ART Nº',            value: fmt(project.artNumber) },
      { label: 'Protocolo',         value: fmt(project.protocolNumber) },
      { label: 'Data Protocolo',    value: fmtDate(project.protocolDate as string) },
    ],
  }

  return {
    title: `${typeName} — ${fmt(client?.name, 'Cliente')}`,
    sections: [clientSection, projectSection, ...(specificSection ? [specificSection] : []), techSection],
  }
}

function buildSpecificSection(p: Record<string, unknown>): DocSection | null {
  const code = String(p.requestTypeId ?? '')

  if (code === 'CONNECTION_NEW' || code === 'STANDARD_ADEQUACY') {
    return {
      heading: 'Dados Elétricos',
      rows: [
        { label: 'Classe',            value: CLIENT_CLASS_LABELS[String(p.clientClass ?? '')] ?? BLANK },
        { label: 'Tensão (kV)',       value: p.supplyVoltage   ? `${p.supplyVoltage} kV`   : BLANK },
        { label: 'Pot. Instalada',    value: p.installedPower  ? `${p.installedPower} kW`  : BLANK },
        { label: 'Pot. Demandada',    value: p.demandedPower   ? `${p.demandedPower} kW`   : BLANK },
        { label: 'Tipo de Entrada',   value: ENTRY_TYPE_LABELS[String(p.entryType ?? '')] ?? BLANK },
      ],
    }
  }

  if (code === 'DEMAND_CHANGE') {
    return {
      heading: 'Alteração de Demanda',
      rows: [
        { label: 'Demanda Atual',     value: p.currentDemand ? `${p.currentDemand} kW` : BLANK },
        { label: 'Nova Demanda',      value: p.newDemand     ? `${p.newDemand} kW`     : BLANK },
        { label: 'Justificativa',     value: fmt(p.demandChangeReason) },
      ],
    }
  }

  if (code === 'OWNERSHIP_TRANSFER') {
    return {
      heading: 'Troca de Titularidade',
      rows: [
        { label: 'Titular Atual',     value: fmt(p.currentOwnerName) },
        { label: 'CPF/CNPJ Atual',    value: fmt(p.currentOwnerDocument) },
        { label: 'Novo Titular',      value: fmt(p.newOwnerName) },
        { label: 'CPF/CNPJ Novo',     value: fmt(p.newOwnerDocument) },
        { label: 'Relação c/ Imóvel', value: fmt(p.propertyRelation) },
        { label: 'Data de Posse',     value: fmtDate(p.possessionDate as string) },
      ],
    }
  }

  if (code === 'SCHEDULED_SHUTDOWN') {
    return {
      heading: 'Desligamento Programado',
      rows: [
        { label: 'Data Solicitada',       value: fmtDate(p.shutdownDate as string) },
        { label: 'Horário',               value: fmt(p.shutdownTime) },
        { label: 'Motivo',                value: fmt(p.shutdownReason) },
        { label: 'Responsável no Local',  value: fmt(p.onSiteContact) },
        { label: 'Telefone no Dia',       value: fmt(p.onSitePhone) },
      ],
    }
  }

  return null
}

// ── Gerador de HTML comum ──────────────────────────────────────────────────

function renderSections(data: DocumentData): string {
  return data.sections.map(sec => `
    <div class="section">
      <h2>${sec.heading}</h2>
      <table><tbody>
        ${sec.rows.map(r => `
          <tr>
            <td class="label">${r.label}</td>
            <td class="value">${r.value === BLANK ? '<em style="color:#ccc">não preenchido</em>' : r.value}</td>
          </tr>
        `).join('')}
      </tbody></table>
    </div>
  `).join('')
}

const SIGNATURE_HTML = `
  <div class="signatures">
    <div class="sig-line">Assinatura do Solicitante</div>
    <div class="sig-line">Responsável Técnico</div>
    <div class="sig-line">Concessionária</div>
  </div>
  <p class="footer">Documento gerado automaticamente pelo sistema SubStation — ${new Date().toLocaleDateString('pt-BR')}</p>
`

// ── Download PDF ───────────────────────────────────────────────────────────

export function downloadAsPdf(data: DocumentData) {
  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11pt;color:#111;padding:2cm}
    h1{font-size:14pt;text-align:center;border-bottom:1.5pt solid #000;padding-bottom:3mm;margin-bottom:6mm}
    .meta{text-align:center;font-size:9pt;color:#666;margin-bottom:10mm}
    .section{margin-bottom:6mm}
    .section h2{font-size:11pt;font-weight:bold;background:#e8e8e8;padding:2mm 3mm;margin-bottom:1mm}
    table{width:100%;border-collapse:collapse}
    td{border:.5pt solid #ccc;padding:2mm 3mm;vertical-align:top;font-size:10pt}
    td.label{width:42%;font-weight:600;background:#f7f7f7;color:#444}
    .signatures{display:flex;gap:15mm;margin-top:18mm}
    .sig-line{flex:1;border-top:1pt solid #000;padding-top:3mm;font-size:9pt;text-align:center}
    .footer{margin-top:8mm;font-size:8pt;color:#aaa;text-align:center;border-top:.5pt solid #eee;padding-top:3mm}
    @media print{body{padding:1.5cm}@page{margin:1.5cm}}
  `
  const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><title>${data.title}</title><style>${css}</style></head>
<body>
  <h1>${data.title}</h1>
  <p class="meta">Gerado em ${new Date().toLocaleDateString('pt-BR')} via SubStation</p>
  ${renderSections(data)}
  ${SIGNATURE_HTML}
</body></html>`

  const win = window.open('', '_blank')
  if (!win) { alert('Permita popups para gerar o PDF.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
}

// ── Download Word (.doc) ───────────────────────────────────────────────────

export function downloadAsDocx(data: DocumentData, filename: string) {
  const sectionsHtml = data.sections.map(sec => `
    <h2 style="font-size:11pt;font-weight:bold;background:#e8e8e8;padding:3pt 6pt;margin-top:10pt;margin-bottom:2pt;">${sec.heading}</h2>
    <table border="1" cellspacing="0" cellpadding="4"
      style="width:100%;border-collapse:collapse;border-color:#ccc;font-size:10pt;margin-bottom:6pt;">
      <tbody>${sec.rows.map(r => `
        <tr>
          <td style="width:42%;background:#f7f7f7;font-weight:600;color:#444;">${r.label}</td>
          <td>${r.value === BLANK ? '' : r.value}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `).join('')

  const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
  xmlns:w='urn:schemas-microsoft-com:office:word'
  xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="UTF-8"><title>${data.title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>body{font-family:Arial,sans-serif;font-size:11pt;margin:2cm}
h1{font-size:14pt;text-align:center;border-bottom:1pt solid #000;padding-bottom:4pt;margin-bottom:8pt}</style>
</head>
<body>
  <h1>${data.title}</h1>
  <p style="text-align:center;font-size:9pt;color:#888;margin-bottom:14pt;">
    Gerado em ${new Date().toLocaleDateString('pt-BR')} via SubStation
  </p>
  ${sectionsHtml}
  <table style="width:100%;margin-top:22pt;border-collapse:collapse;">
    <tr>
      ${['Assinatura do Solicitante','Responsável Técnico','Concessionária'].map(s =>
        `<td style="width:33%;border-top:1pt solid #000;padding-top:4pt;text-align:center;font-size:9pt;">${s}</td>`
      ).join('')}
    </tr>
  </table>
  <p style="text-align:center;font-size:8pt;color:#aaa;margin-top:10pt;">
    Documento gerado automaticamente pelo sistema SubStation
  </p>
</body></html>`

  const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${filename}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
