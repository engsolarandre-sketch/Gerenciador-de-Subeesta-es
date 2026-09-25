import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const stageStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  WAITING_APPROVAL: 'Aguardando aprovação',
  COMPLETED: 'Concluída',
  SKIPPED: 'Não aplicável',
}

const fieldLabels: Record<string, string> = {
  status: 'Status',
  notes: 'Observações técnicas',
  protocol: 'Protocolo / referência',
  planned_start_date: 'Início previsto',
  planned_end_date: 'Conclusão prevista',
}

type Recipient = { email: string; name: string; audience: 'internal' | 'reseller' }
type Change = { field: string; label: string; before: string; after: string }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function displayValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  if (field === 'status') return stageStatusLabels[String(value)] ?? String(value)
  if (field.includes('_date') || field === 'completed_at') {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(String(value)))
  }
  return String(value)
}

function emailHtml(options: {
  recipient: Recipient
  project: Record<string, unknown>
  stage: Record<string, unknown>
  clientName: string
  resellerName: string
  actorName: string
  changes: Change[]
  appUrl: string
}) {
  const { recipient, project, stage, clientName, resellerName, actorName, changes, appUrl } = options
  const link = recipient.audience === 'reseller'
    ? `${appUrl}/portal/${project.reseller_id}`
    : `${appUrl}/projects/${project.id}`
  const rows = changes.map(change => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#475569;font-size:13px;font-weight:600;vertical-align:top">${escapeHtml(change.label)}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:13px;vertical-align:top">${escapeHtml(change.before)}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:13px;vertical-align:top">${escapeHtml(change.after)}</td>
    </tr>`).join('')
  const stageDates = [
    { label: 'Data de início', value: displayValue('planned_start_date', stage.planned_start_date) },
    { label: 'Término previsto', value: displayValue('planned_end_date', stage.planned_end_date) },
    { label: 'Conclusão real', value: displayValue('completed_at', stage.completed_at) },
  ]
  const dateRows = stageDates.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:12px;font-weight:600">${escapeHtml(item.label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:13px">${escapeHtml(item.value)}</td>
    </tr>`).join('')
  const notes = String(stage.notes ?? '').trim()
  const notesBlock = notes ? `
    <div style="margin:0 0 22px">
      <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:7px">Comentário da atividade</div>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;padding:13px 14px;color:#334155;font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(notes)}</div>
    </div>` : ''

  return `<!doctype html>
  <html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px">
      <div style="background:#07111f;padding:22px 26px;border-radius:8px 8px 0 0">
        <div style="color:#2dd4bf;font-size:12px;font-weight:700;text-transform:uppercase">SubStation Manager</div>
        <h1 style="color:#fff;font-size:21px;line-height:1.3;margin:8px 0 0">Uma etapa do projeto foi atualizada</h1>
      </div>
      <div style="background:#fff;padding:26px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:0">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6">Olá, ${escapeHtml(recipient.name)}.</p>
        <div style="background:#f8fafc;border-left:4px solid #0f9f94;padding:14px 16px;margin-bottom:22px">
          <div style="font-size:16px;font-weight:700">${escapeHtml(project.title)}</div>
          <div style="font-size:13px;color:#64748b;margin-top:5px">Cliente: ${escapeHtml(clientName)} · Revendedor: ${escapeHtml(resellerName)}</div>
          <div style="font-size:13px;color:#334155;margin-top:5px">Etapa ${escapeHtml(stage.stage_number)}: ${escapeHtml(stage.title)}</div>
        </div>
        <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:7px">Datas da atividade</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;margin-bottom:22px">
          <tbody>${dateRows}</tbody>
        </table>
        ${notesBlock}
        <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:7px">Alterações registradas</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
          <thead><tr style="background:#f8fafc">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Campo</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Antes</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Agora</th>
          </tr></thead><tbody>${rows}</tbody>
        </table>
        <p style="font-size:12px;color:#64748b;margin:16px 0 22px">Alteração registrada por ${escapeHtml(actorName)}.</p>
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#0f8f87;color:#fff;text-decoration:none;padding:11px 17px;border-radius:6px;font-size:13px;font-weight:700">Acessar projeto</a>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:11px;margin:16px 0 0">Mensagem automática. Não responda a este e-mail.</p>
    </div>
  </body></html>`
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !serviceRoleKey || !authorization?.startsWith('Bearer ')) {
    return json({ error: 'Não autorizado.' }, 401)
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const token = authorization.slice('Bearer '.length)
  const { data: userData, error: userError } = await service.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Sessão inválida.' }, 401)

  const { data: actor } = await service
    .from('app_users')
    .select('name, active')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (!actor?.active) return json({ error: 'Usuário inativo.' }, 403)

  let body: { projectId?: string; stageId?: string; changes?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Dados inválidos.' }, 400)
  }
  if (!body.projectId || !body.stageId || !body.changes) {
    return json({ error: 'Projeto, etapa e alterações são obrigatórios.' }, 400)
  }

  const { data: previousStage, error: stageError } = await service
    .from('stages')
    .select('*')
    .eq('id', body.stageId)
    .eq('project_id', body.projectId)
    .single()
  if (stageError || !previousStage) return json({ error: 'Etapa não encontrada.' }, 404)

  const input = body.changes
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (Object.hasOwn(input, 'status')) {
    const status = String(input.status)
    if (!Object.hasOwn(stageStatusLabels, status)) return json({ error: 'Status de etapa inválido.' }, 400)
    update.status = status
    if (status === 'COMPLETED' && !previousStage.completed_at) update.completed_at = new Date().toISOString()
    if (status === 'IN_PROGRESS' && !previousStage.actual_start_date) update.actual_start_date = new Date().toISOString()
  }
  if (Object.hasOwn(input, 'notes')) update.notes = input.notes ? String(input.notes).trim() : null
  if (Object.hasOwn(input, 'protocol')) update.protocol = input.protocol ? String(input.protocol).trim() : null
  if (Object.hasOwn(input, 'plannedStartDate')) update.planned_start_date = input.plannedStartDate || null
  if (Object.hasOwn(input, 'plannedEndDate')) update.planned_end_date = input.plannedEndDate || null

  const { data: updatedStage, error: updateError } = await service
    .from('stages')
    .update(update)
    .eq('id', body.stageId)
    .select('*')
    .single()
  if (updateError || !updatedStage) return json({ error: updateError?.message ?? 'Não foi possível atualizar a etapa.' }, 500)

  await service.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', body.projectId)

  const comparableFields = ['status', 'notes', 'protocol', 'planned_start_date', 'planned_end_date']
  const changes: Change[] = comparableFields.flatMap(field => {
    const before = previousStage[field] ?? null
    const after = updatedStage[field] ?? null
    if (String(before ?? '') === String(after ?? '')) return []
    return [{
      field,
      label: fieldLabels[field],
      before: displayValue(field, before),
      after: displayValue(field, after),
    }]
  })

  if (changes.length === 0) {
    return json({ stage: updatedStage, notification: { status: 'skipped', sent: 0, failed: 0, message: 'Nenhuma alteração nova para notificar.' } })
  }

  const { data: project, error: projectError } = await service
    .from('projects')
    .select('*')
    .eq('id', body.projectId)
    .single()
  if (projectError || !project) return json({ stage: updatedStage, notification: { status: 'failed', sent: 0, failed: 0, message: 'Projeto atualizado, mas os dados do e-mail não foram encontrados.' } })

  const [clientResult, resellerResult, contactsResult, usersResult] = await Promise.all([
    service.from('clients').select('name').eq('id', project.client_id).maybeSingle(),
    service.from('resellers').select('name, email').eq('id', project.reseller_id).maybeSingle(),
    service.from('reseller_contacts').select('name, email').eq('reseller_id', project.reseller_id),
    service.from('app_users').select('name, email').eq('active', true).eq('notify_stage_changes', true),
  ])

  const reseller = resellerResult.data
  const recipientMap = new Map<string, Recipient>()
  for (const user of usersResult.data ?? []) {
    if (user.email) recipientMap.set(user.email.toLowerCase(), { email: user.email, name: user.name, audience: 'internal' })
  }
  if (reseller?.email) {
    recipientMap.set(reseller.email.toLowerCase(), { email: reseller.email, name: reseller.name, audience: 'reseller' })
  }
  for (const contact of contactsResult.data ?? []) {
    if (contact.email) recipientMap.set(contact.email.toLowerCase(), { email: contact.email, name: contact.name, audience: 'reseller' })
  }
  const recipients = [...recipientMap.values()]
  const logId = crypto.randomUUID()
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
  const appUrl = Deno.env.get('APP_URL') ?? 'https://gerenciador-de-subeesta-es.vercel.app'

  if (recipients.length === 0 || !resendApiKey || !fromEmail) {
    const message = recipients.length === 0
      ? 'Projeto atualizado, mas nenhum destinatário possui e-mail ativo.'
      : 'Projeto atualizado, mas o Resend ainda não está configurado no Supabase.'
    await service.from('stage_email_notifications').insert({
      id: logId,
      project_id: project.id,
      stage_id: updatedStage.id,
      actor_user_id: userData.user.id,
      recipients,
      changes,
      status: 'skipped',
      error_message: message,
    })
    return json({ stage: updatedStage, notification: { status: 'skipped', sent: 0, failed: 0, message } })
  }

  const subject = `${project.title} · Etapa ${updatedStage.stage_number} atualizada`
  const results = await Promise.all(recipients.map(async recipient => {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `${logId}:${recipient.email.toLowerCase()}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient.email],
          subject,
          html: emailHtml({
            recipient,
            project,
            stage: updatedStage,
            clientName: clientResult.data?.name ?? 'Não informado',
            resellerName: reseller?.name ?? 'Não informado',
            actorName: actor.name,
            changes,
            appUrl,
          }),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.message ?? `Resend respondeu ${response.status}`)
      return { email: recipient.email, ok: true, id: payload.id as string }
    } catch (error) {
      return { email: recipient.email, ok: false, error: error instanceof Error ? error.message : 'Falha desconhecida' }
    }
  }))

  const sent = results.filter(result => result.ok)
  const failed = results.filter(result => !result.ok)
  const status = failed.length === 0 ? 'sent' : sent.length > 0 ? 'partial' : 'failed'
  const errorMessage = failed.length > 0
    ? failed.map(result => `${result.email}: ${'error' in result ? result.error : 'falha'}`).join('; ')
    : null

  await service.from('stage_email_notifications').insert({
    id: logId,
    project_id: project.id,
    stage_id: updatedStage.id,
    actor_user_id: userData.user.id,
    recipients,
    changes,
    status,
    provider_message_ids: sent.map(result => ('id' in result ? result.id : null)).filter(Boolean),
    error_message: errorMessage,
    sent_at: sent.length > 0 ? new Date().toISOString() : null,
  })

  const message = failed.length === 0
    ? `Alteração salva e ${sent.length} e-mail${sent.length === 1 ? '' : 's'} enviado${sent.length === 1 ? '' : 's'}.`
    : `Alteração salva. ${sent.length} envio(s) concluído(s) e ${failed.length} com falha.`
  return json({ stage: updatedStage, notification: { status, sent: sent.length, failed: failed.length, message } })
})
