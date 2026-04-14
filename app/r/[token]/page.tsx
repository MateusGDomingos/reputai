import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReviewForm from './ReviewForm'

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Usa cliente padrão (anon key + RLS) — NÃO usar service_role em rotas públicas
  const supabase = await createClient()

  const { data: request, error } = await supabase
    .from('review_requests')
    .select('id, tenant_id, tenants(name, google_review_url)')
    .eq('token', token)
    .single()

  if (!request) return notFound()

  await supabase
    .from('review_requests')
    .update({ clicked_at: new Date().toISOString(), status: 'clicked' })
    .eq('id', request.id)

  const tenant = request.tenants as any

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <ReviewForm
        requestId={request.id}
        token={token}
        tenantName={tenant?.name || "nossa empresa"}
        googleReviewUrl={tenant?.google_review_url || null}
      />
    </div>
  )
}
