
import { createClient } from '@/lib/supabase/server'
 
async function getStats(tenantId: string) {
  const supabase = await createClient()
 
  const [contacts, requests, clicked] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('review_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('review_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).not('clicked_at', 'is', null),
  ])
 
  const total = requests.count || 0
  const click = clicked.count || 0
 
  return {
    totalContacts: contacts.count || 0,
    totalRequests: total,
    totalClicked: click,
    conversionRate: total > 0 ? Math.round((click / total) * 100) : 0,
  }
}
 
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
 
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, tenant_id, tenants(name)')
    .eq('id', user!.id)
    .single()
 
  const stats = await getStats(profile?.tenant_id || '')
  const firstName = profile?.name?.split(' ')[0] || 'usuario'
 
  const cards = [
    { label: 'Contatos', value: stats.totalContacts },
    { label: 'Pedidos Enviados', value: stats.totalRequests },
    { label: 'Clicaram no Link', value: stats.totalClicked },
    { label: 'Taxa de Conversao', value: String(stats.conversionRate) + '%' },
  ]
 
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Ola, {firstName}</h2>
        <p className="text-slate-500 mt-1">Resumo da sua reputacao</p>
      </div>
 
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>
 
      {stats.totalContacts === 0 && (
        <div className="bg-slate-900 rounded-xl p-6 text-white">
          <h3 className="font-semibold text-lg">Comece agora</h3>
          <p className="text-slate-300 mt-1 text-sm">
            Importe seus contatos e envie seu primeiro pedido de review em minutos.
          </p>
          <a
            href="/dashboard/contacts"
            className="inline-block mt-4 bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            Adicionar contatos
          </a>
        </div>
      )}
    </div>
  )
}