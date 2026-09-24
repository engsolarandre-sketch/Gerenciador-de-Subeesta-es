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
    .select('role, active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!actor?.active || actor.role !== 'admin') {
    return json({ error: 'Somente administradores podem convidar usuários.' }, 403)
  }

  let body: { action?: string; email?: string; name?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Dados inválidos.' }, 400)
  }

  if (body.action !== 'invite') return json({ error: 'Ação não suportada.' }, 400)

  const email = body.email?.trim().toLowerCase()
  const name = body.name?.trim()
  const role = body.role === 'admin' ? 'admin' : 'member'
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name) {
    return json({ error: 'Informe nome e e-mail válidos.' }, 400)
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://gerenciador-de-subeesta-es.vercel.app'
  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: `${appUrl}/login`,
  })

  if (inviteError || !invited.user) {
    const message = inviteError?.message?.toLowerCase().includes('already')
      ? 'Já existe um usuário com este e-mail.'
      : inviteError?.message ?? 'Não foi possível convidar o usuário.'
    return json({ error: message }, 400)
  }

  const { data: profile, error: profileError } = await service
    .from('app_users')
    .upsert({
      id: invited.user.id,
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
  return json({ user: profile })
})
