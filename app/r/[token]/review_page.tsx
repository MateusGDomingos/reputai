import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReviewForm from './ReviewForm'

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  const { data: request } = await supabase
    .from('review_requests')
    .select('id, status, token, tenant_id, tenants(name, google_review_url)')
    .eq('token', params.token)
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
        tenantName={tenant?.name || 'nossa empresa'}
        googleReviewUrl={tenant?.google_review_url || null}
      />
    </div>
  )
}
