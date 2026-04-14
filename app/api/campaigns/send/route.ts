import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`${ZAPI_BASE}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': process.env.ZAPI_CLIENT_TOKEN!,
      },
      body: JSON.stringify({ phone, message }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { contactIds, message, tenantId } = await req.json()

    if (!contactIds?.length || !message || !tenantId) {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar que o tenantId pertence ao usuário autenticado (previne IDOR)
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, phone')
      .in('id', contactIds)
      .eq('tenant_id', tenantId)

    if (!contacts?.length) {
      return NextResponse.json({ error: 'Contatos nao encontrados' }, { status: 404 })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', tenantId)
      .single()

    let ok = 0
    let fail = 0

    for (const contact of contacts) {
      const token = crypto.randomUUID()
      const reviewLink = `${process.env.NEXT_PUBLIC_APP_URL}/r/${token}`

      const personalizedMessage = message
        .replace('{nome}', contact.name.split(' ')[0])
        .replace('{link}', reviewLink)

      const phone = contact.phone.startsWith('55')
        ? contact.phone
        : `55${contact.phone}`

      const sent = await sendWhatsApp(phone, personalizedMessage)

      await supabase.from('review_requests').insert({
        tenant_id: tenantId,
        contact_id: contact.id,
        channel: 'whatsapp',
        status: sent ? 'sent' : 'failed',
        token,
      })

      if (sent) {
        ok++
      } else {
        fail++
      }

      await new Promise(r => setTimeout(r, 1000))
    }

    return NextResponse.json({ ok, fail })
  } catch (err) {
    console.error('Campaign send error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
