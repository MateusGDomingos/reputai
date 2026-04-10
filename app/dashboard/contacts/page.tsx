'use client'
 
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Upload, Trash2, Search, X } from 'lucide-react'
import Papa from 'papaparse'
 
type Contact = {
  id: string
  name: string
  phone: string
  email: string | null
  last_visit: string | null
  created_at: string
}
 
export default function ContactsPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
 
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
 
  const [form, setForm] = useState({ name: '', phone: '', email: '', last_visit: '' })
 
  useEffect(() => {
    loadContacts()
  }, [])
 
  async function loadContacts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user!.id)
      .single()
 
    setTenantId(profile?.tenant_id)
 
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', profile?.tenant_id)
      .order('created_at', { ascending: false })
 
    setContacts(data || [])
    setLoading(false)
  }
 
  async function handleSave() {
    if (!form.name || !form.phone || !tenantId) return
    setSaving(true)
 
    const phone = form.phone.replace(/\D/g, '')
 
    await supabase.from('contacts').insert({
      tenant_id: tenantId,
      name: form.name,
      phone,
      email: form.email || null,
      last_visit: form.last_visit || null,
    })
 
    setForm({ name: '', phone: '', email: '', last_visit: '' })
    setShowModal(false)
    setSaving(false)
    loadContacts()
  }
 
  async function handleDelete(id: string) {
    if (!confirm('Remover este contato?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }
 
  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return
 
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[]
        const toInsert = rows
          .filter(r => r.nome || r.name)
          .map(r => ({
            tenant_id: tenantId,
            name: r.nome || r.name || '',
            phone: (r.telefone || r.phone || '').replace(/\D/g, ''),
            email: r.email || null,
            last_visit: r.ultima_visita || r.last_visit || null,
          }))
          .filter(r => r.phone.length >= 10)
 
        if (toInsert.length === 0) {
          alert('Nenhum contato valido encontrado. Verifique as colunas: nome, telefone, email')
          return
        }
 
        await supabase.from('contacts').insert(toInsert)
        alert(`${toInsert.length} contatos importados!`)
        loadContacts()
      }
    })
 
    e.target.value = ''
  }
 
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )
 
  function formatPhone(phone: string) {
    const d = phone.replace(/\D/g, '')
    if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
    return phone
  }
 
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contatos</h2>
          <p className="text-slate-500 mt-1">{contacts.length} contatos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Upload size={16} />
            Importar CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus size={16} />
            Novo contato
          </button>
        </div>
      </div>
 
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>
 
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">Nenhum contato encontrado.</p>
            <p className="text-slate-400 text-xs mt-1">Adicione manualmente ou importe um CSV.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Telefone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Ultima Visita</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(contact => (
                <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{contact.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatPhone(contact.phone)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{contact.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {contact.last_visit ? new Date(contact.last_visit).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
 
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Novo contato</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
 
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Joao Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone * (com DDD)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="35999999999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="joao@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ultima visita</label>
                <input
                  type="date"
                  value={form.last_visit}
                  onChange={e => setForm(p => ({ ...p, last_visit: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
 
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-300 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.phone}
                className="flex-1 bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
 