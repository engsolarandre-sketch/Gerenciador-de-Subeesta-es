import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function normalizeAppUrl(value: string | undefined) {
  return (value ?? 'https://gerenciador-de-subeesta-es.vercel.app').replace(/\/$/, '')
}

async function sendAccessEmail({ email, name, actionLink, kind }: {
  email: string
  name: string
  actionLink: string
  kind: 'invite' | 'recovery'
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!resendApiKey || !from) throw new Error('Os secrets do Resend não estão configurados.')

  const isInvite = kind === 'invite'
  const title = isInvite ? 'Convite para o Gerenciador de Subestações' : 'Redefinição de senha'
  const intro = isInvite
    ? 'Você foi convidado para acessar o Gerenciador de Subestações da ALS Energia.'
    : 'Recebemos uma solicitação para definir uma nova senha da sua conta.'
  const button = isInvite ? 'Aceitar convite e criar senha' : 'Definir nova senha'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: title,
      html: `
        <div style="background:#f3f5f7;padding:32px 16px;font-family:Arial,sans-serif;color:#17212b">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d9e1ea;padding:32px">
            <div style="font-size:13px;font-weight:700;color:#067078;margin-bottom:16px">ALS ENERGIA</div>
            <h1 style="font-size:22px;line-height:1.3;margin:0 0 14px">${title}</h1>
            <p style="font-size:15px;line-height:1.6;margin:0 0 10px">Olá, ${escapeHtml(name)}.</p>
            <p style="font-size:15px;line-height:1.6;margin:0 0 24px">${intro}</p>
            <a href="${escapeHtml(actionLink)}" style="display:inline-block;background:#067078;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">${button}</a>
            <p style="font-size:12px;line-height:1.6;color:#607080;margin:24px 0 0">Por segurança, este link é temporário. Se você não solicitou este acesso, ignore esta mensagem.</p>
          </div>
        </div>
      `,
    }),
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result?.message ?? 'O Resend recusou o envio do e-mail.')
  return result
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Serviço indisponível.' }, 500)

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let body: {
    action?: string
    id?: string
    email?: string
    name?: string
    role?: string
    active?: boolean
    notifyStageChanges?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Dados inválidos.' }, 400)
  }

  const appUrl = normalizeAppUrl(Deno.env.get('APP_URL'))

  // Esta ação é pública e não revela se o endereço está cadastrado.
  if (body.action === 'request-password-reset') {
    const email = body.email?.trim().toLowerCase()
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ error: 'Informe um e-mail válido.' }, 400)
    }

    const { data: profile } = await service
      .from('app_users')
      .select('name, email, active')
      .eq('email', email)
      .maybeSingle()

    if (profile?.active) {
      const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${appUrl}/redefinir-senha` },
      })
      if (linkError || !linkData.properties?.action_link) {
        console.error('Não foi possível gerar o link de recuperação.', linkError)
        return json({ error: 'Não foi possível enviar a recuperação agora. Tente novamente.' }, 500)
      }
      try {
        await sendAccessEmail({
          email,
          name: profile.name,
          actionLink: linkData.properties.action_link,
          kind: 'recovery',
        })
      } catch (error) {
        console.error('Não foi possível enviar a recuperação.', error)
        return json({ error: 'Não foi possível enviar a recuperação agora. Tente novamente.' }, 500)
      }
    }

    return json({ message: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.' })
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Não autorizado.' }, 401)

  const token = authorization.slice('Bearer '.length)
  const { data: userData, error: userError } = await service.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Sessão inválida.' }, 401)

  const { data: actor } = await service
    .from('app_users')
    .select('role, active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!actor?.active || actor.role !== 'admin') {
    return json({ error: 'Somente administradores podem gerenciar usuários.' }, 403)
  }

  if (body.action === 'invite') {
    const email = body.email?.trim().toLowerCase()
    const name = body.name?.trim()
    const role = body.role === 'admin' ? 'admin' : 'member'
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name) {
      return json({ error: 'Informe nome e e-mail válidos.' }, 400)
    }

    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { name }, redirectTo: `${appUrl}/redefinir-senha` },
    })

    if (linkError || !linkData.user || !linkData.properties?.action_link) {
      const message = linkError?.message?.toLowerCase().includes('already')
        ? 'Já existe um usuário com este e-mail. Use Reenviar convite.'
        : linkError?.message ?? 'Não foi possível gerar o convite.'
      return json({ error: message }, 400)
    }

    const { data: profile, error: profileError } = await service
      .from('app_users')
      .upsert({
        id: linkData.user.id,
        name,
        email,
        role,
        active: true,
        notify_stage_changes: true,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (profileError) return json({ error: profileError.message }, 500)

    try {
      await sendAccessEmail({ email, name, actionLink: linkData.properties.action_link, kind: 'invite' })
    } catch (error) {
      console.error('Convite criado, mas o envio falhou.', error)
      return json({ error: error instanceof Error ? error.message : 'Não foi possível enviar o convite.' }, 502)
    }

    return json({ user: profile, message: 'Convite enviado pelo Resend.' })
  }

  const id = body.id?.trim()
  if (!id) return json({ error: 'Usuário não informado.' }, 400)

  const { data: target } = await service.from('app_users').select('*').eq('id', id).maybeSingle()
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404)

  if (body.action === 'resend-invite') {
    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: 'recovery',
      email: target.email,
      options: { redirectTo: `${appUrl}/redefinir-senha` },
    })
    if (linkError || !linkData.properties?.action_link) {
      return json({ error: linkError?.message ?? 'Não foi possível gerar um novo convite.' }, 400)
    }
    try {
      await sendAccessEmail({
        email: target.email,
        name: target.name,
        actionLink: linkData.properties.action_link,
        kind: 'invite',
      })
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Não foi possível reenviar o convite.' }, 502)
    }
    return json({ message: `Convite reenviado para ${target.email}.` })
  }

  if (body.action === 'update') {
    const nextName = body.name?.trim() ?? target.name
    const nextEmail = body.email?.trim().toLowerCase() ?? target.email
    const nextRole = body.role === undefined ? target.role : body.role === 'admin' ? 'admin' : 'member'
    const nextActive = body.active ?? target.active
    const nextNotify = body.notifyStageChanges ?? target.notify_stage_changes

    if (!nextName || !/^\S+@\S+\.\S+$/.test(nextEmail)) {
      return json({ error: 'Informe nome e e-mail válidos.' }, 400)
    }

    if (target.role === 'admin' && target.active && (nextRole !== 'admin' || !nextActive)) {
      const { count } = await service
        .from('app_users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('active', true)
      if ((count ?? 0) <= 1) return json({ error: 'Mantenha pelo menos um administrador ativo.' }, 400)
    }

    const { error: authError } = await service.auth.admin.updateUserById(id, {
      email: nextEmail,
      email_confirm: true,
      user_metadata: { name: nextName },
    })
    if (authError) return json({ error: authError.message }, 400)

    const { data: profile, error: profileError } = await service
      .from('app_users')
      .update({
        name: nextName,
        email: nextEmail,
        role: nextRole,
        active: nextActive,
        notify_stage_changes: nextNotify,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (profileError) return json({ error: profileError.message }, 500)
    return json({ user: profile, message: 'Usuário atualizado.' })
  }

  if (body.action === 'delete') {
    if (id === userData.user.id) return json({ error: 'Você não pode excluir sua própria conta.' }, 400)
    if (target.role === 'admin' && target.active) {
      const { count } = await service
        .from('app_users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('active', true)
      if ((count ?? 0) <= 1) return json({ error: 'O último administrador ativo não pode ser excluído.' }, 400)
    }
    const { error } = await service.auth.admin.deleteUser(id)
    if (error) return json({ error: error.message }, 400)
    return json({ message: 'Usuário excluído.' })
  }

  return json({ error: 'Ação não suportada.' }, 400)
})
