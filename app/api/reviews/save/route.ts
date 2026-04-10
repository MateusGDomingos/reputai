import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { requestId, stars, feedback } = await req.json()

    if (!requestId || !stars) {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: request } = await supabase
      .from('review_requests')
      .select('tenant_id')
      .eq('id', requestId)
      .single()

    if (!request) {
      return NextResponse.json({ error: 'Request nao encontrado' }, { status: 404 })
    }

    await supabase
      .from('review_requests')
      .update({
        stars_given: stars,
        feedback_text: feedback || null,
        status: stars >= 4 ? 'reviewed' : 'feedback',
      })
      .eq('id', requestId)

    if (stars < 4 && feedback) {
      await supabase.from('reviews').insert({
        tenant_id: request.tenant_id,
        source: 'internal',
        stars,
        body: feedback,
        sentiment: stars <= 2 ? 'negative' : 'neutral',
        review_date: new Date().toISOString().split('T')[0],
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Save review error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
