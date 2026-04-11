
'use client'
 
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Clock, CheckCheck, MousePointerClick, Search } from 'lucide-react'
 
type Contact = {
  id: string
  name: string
  phone: string
}
 
type Request = {
  id: string
  status: string
  sent_at: string
  clicked_at: string | null
  channel: string
  contacts: { name: string; phone: string }[] | null
}
 
const MESSAGE_TEMPLATES: Record<string, string> = {
  clinica: 'Ola, {nome}! Obrigado por nos visitar. Sua opiniao e muito importante. Poderia nos avaliar no Google? Leva menos de 1 minuto: {link}',
  salao: 'Ola, {nome}! Foi um prazer te atender! Que tal deixar uma avaliacao sobre sua experiencia? {link}',
  oficina: 'Ola, {nome}! Obrigado pela confianca. Ficamos felizes em ter te atendido. Avalie nosso servico aqui: {link}',
  padrao: 'Ola, {nome}! Obrigado pela sua visita. Poderia nos avaliar? Sua opiniao nos ajuda muito: {link}',
}
 
export default function CampaignsPage() {
  const supabase = createClient()
 
  const [tab, setTab] = useState<'send' | 'history'>('send')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [template, setTemplate] = useState('padrao')
  const [message, setMessage] = useState(MESSAGE_TEMPLATES['padrao'])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null)
 
  useEffect(() => {
    loadData()
  }, [])
 
  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user!.id)
      .single()
 
    setTenantId(profile?.tenant_id)
 
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from('contacts').select('id, name, phone').eq('tenant_id', profile?.tenant_id).order('name'),
      supabase.from('review_requests').select('id, status, sent_at, clicked_at, channel, contacts(name, phone)').eq('tenant_id', profile?.tenant_id).order('sent_at', { ascending: false }).limit(50),
    ])
 
    setContacts(c || [])
    setRequests(r || [])
    setLoading(false)
  }
 
  function toggleContact(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }
 
  function toggleAll() {
    const filteredIds = filtered.map(c => c.id)
    const allSelected = filteredIds.every(id => selected.includes(id))
    if (allSelected) {
      setSelected(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelected(prev => [...new Set([...prev, ...filteredIds])])
    }
  }
 
  function handleTemplateChange(key: string) {
    setTemplate(key)
    setMessage(MESSAGE_TEMPLATES[key])
  }
 
  async function handleSend() {
    if (selected.length === 0 || !tenantId) return
    setSending(true)
    setResult(null)
 
    const res = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds: selected, message, tenantId }),
    })
 
    const data = await res.json()
    setResult(data)
    setSelected([])
    setSending(false)
    loadData()
  }
 
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )
 
  const filteredIds = filtered.map(c => c.id)
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selected.includes(id))
 
  function statusBadge(status: string) {
    const map: Record<string, { label: string; class: string }> = {
      sent: { label: 'Enviado', class: 'bg-blue-100 text-blue-700' },
      clicked: { label: 'Clicou', class: 'bg-green-100 text-green-700' },
      reviewed: { label: 'Avaliou', class: 'bg-purple-100 text-purple-700' },
      failed: { label: 'Falhou', class: 'bg-red-100 text-red-700' },
    }
    const s = map[status] || { label: status, class: 'bg-slate-100 text-slate-700' }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
        {s.label}
      </span>
    )
  }
 
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Disparos</h2>
        <p className="text-slate-500 mt-1">Envie pedidos de review para seus contatos</p>
      </div>
 
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('send')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'send' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Novo Disparo
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Historico
        </button>
      </div>
 
      {tab === 'send' && (
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">1. Escolha o template</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.keys(MESSAGE_TEMPLATES).map(key => (
                  <button
                    key={key}
                    onClick={() => handleTemplateChange(key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${template === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-400'}`}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">
                Use {'{nome}'} para o nome do contato e {'{link}'} para o link de review
              </p>
            </div>
 
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">2. Selecione os contatos</h3>
                <span className="text-sm text-slate-500">{selected.length} selecionados</span>
              </div>
 
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar contato..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
 
              {loading ? (
                <p className="text-sm text-slate-500 text-center py-4">Carregando...</p>
              ) : contacts.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhum contato. Adicione em Contatos primeiro.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div
                    onClick={toggleAll}
                    className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
                  >
                    <input type="checkbox" checked={allSelected} onChange={() => {}} className="rounded" />
                    <span className="text-xs font-medium text-slate-600 uppercase">Selecionar todos</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {filtered.map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => toggleContact(contact.id)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(contact.id)}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
 
          <div className="col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-8">
              <h3 className="font-semibold text-slate-900 mb-4">3. Confirmar envio</h3>
 
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Contatos selecionados</span>
                  <span className="font-medium text-slate-900">{selected.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Canal</span>
                  <span className="font-medium text-slate-900">WhatsApp</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Template</span>
                  <span className="font-medium text-slate-900 capitalize">{template}</span>
                </div>
              </div>
 
              {result && (
                <div className={`rounded-lg p-3 mb-4 text-sm ${result.fail === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {result.ok} enviados com sucesso.
                  {result.fail > 0 && ` ${result.fail} falharam.`}
                </div>
              )}
 
              <button
                onClick={handleSend}
                disabled={sending || selected.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
                {sending ? 'Enviando...' : `Enviar para ${selected.length} contato${selected.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
 
      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhum disparo realizado ainda.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Contato</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Canal</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Enviado em</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Clique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {req.contacts?.[0]?.name || 'Desconhecido'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{req.channel}</td>
                    <td className="px-6 py-4">{statusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(req.sent_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {req.clicked_at ? new Date(req.clicked_at).toLocaleString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
 