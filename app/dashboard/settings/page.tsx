'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, ExternalLink, Smartphone, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

type QRStatus = 'loading' | 'qrcode' | 'connected' | 'disconnected' | 'error'

export default function SettingsPage() {
    const supabase = createClient()

    const [tenantId, setTenantId] = useState<string | null>(null)
    const [googleUrl, setGoogleUrl] = useState('')
    const [googlePlaceId, setGooglePlaceId] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const [qrStatus, setQrStatus] = useState<QRStatus>('loading')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [qrLoading, setQrLoading] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, tenants(google_review_url, google_place_id)')
            .eq('id', user!.id)
            .single()

        setTenantId(profile?.tenant_id)
        const tenant = profile?.tenants as any
        setGoogleUrl(tenant?.google_review_url || '')
        setGooglePlaceId(tenant?.google_place_id || '')
        checkWhatsAppStatus()
    }

    async function handleSave() {
        if (!tenantId) return
        setSaving(true)

        await supabase
            .from('tenants')
            .update({
                google_review_url: googleUrl,
                google_place_id: googlePlaceId,
            })
            .eq('id', tenantId)

        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    async function checkWhatsAppStatus() {
        setQrLoading(true)
        try {
            const res = await fetch('/api/whatsapp/status')
            const data = await res.json()
            setQrStatus(data.connected ? 'connected' : 'disconnected')
        } catch {
            setQrStatus('error')
        }
        setQrLoading(false)
    }

    async function getQRCode() {
        setQrStatus('loading')
        setQrLoading(true)
        try {
            const res = await fetch('/api/whatsapp/qrcode')
            const data = await res.json()
            if (data.qrcode) {
                setQrCode(data.qrcode)
                setQrStatus('qrcode')
                pollConnection()
            } else {
                setQrStatus('error')
            }
        } catch {
            setQrStatus('error')
        }
        setQrLoading(false)
    }

    async function pollConnection() {
        let attempts = 0
        const interval = setInterval(async () => {
            attempts++
            try {
                const res = await fetch('/api/whatsapp/status')
                const data = await res.json()
                if (data.connected) {
                    setQrStatus('connected')
                    setQrCode(null)
                    clearInterval(interval)
                }
            } catch { }
            if (attempts >= 30) clearInterval(interval)
        }, 3000)
    }

    function extractGooglePlaceId(url: string) {
        const match = url.match(/place\/([^/]+)\//)
        if (match) setGooglePlaceId(match[1])
    }

    return (
        <div className="p-8 max-w-2xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Configuracoes</h2>
                <p className="text-slate-500 mt-1">Configure sua conta para comecar a usar</p>
            </div>

            {/* Google */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <ExternalLink size={18} className="text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Google Reviews</h3>
                        <p className="text-sm text-slate-500">Link onde clientes deixam avaliacao</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Link do Google Maps
                        </label>
                        <input
                            type="url"
                            value={googleUrl}
                            onChange={e => {
                                setGoogleUrl(e.target.value)
                                extractGooglePlaceId(e.target.value)
                            }}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            placeholder="https://g.page/r/..."
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Google Maps → seu negocio → Compartilhar → Copiar link
                        </p>
                    </div>

                    {googleUrl && (
                        <a
                            href={googleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                            <ExternalLink size={14} />
                            Testar link
                        </a>
                    )}
                </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <Smartphone size={18} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">WhatsApp</h3>
                        <p className="text-sm text-slate-500">Conecte o numero para disparar mensagens</p>
                    </div>
                </div>

                {qrStatus === 'connected' && (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <CheckCircle size={20} className="text-green-600" />
                            <div>
                                <p className="font-medium text-green-900 text-sm">WhatsApp conectado</p>
                                <p className="text-xs text-green-700">Pronto para enviar mensagens</p>
                            </div>
                        </div>
                        <button
                            onClick={checkWhatsAppStatus}
                            className="text-green-600 hover:text-green-800 transition-colors"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                )}

                {qrStatus === 'disconnected' && (
                    <div className="text-center py-4">
                        <div className="flex items-center justify-center gap-2 text-slate-500 mb-4">
                            <XCircle size={18} className="text-red-400" />
                            <span className="text-sm">Nenhum numero conectado</span>
                        </div>
                        <button
                            onClick={getQRCode}
                            disabled={qrLoading}
                            className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {qrLoading ? 'Gerando QR...' : 'Conectar WhatsApp'}
                        </button>
                    </div>
                )}

                {qrStatus === 'qrcode' && qrCode && (
                    <div className="text-center">
                        <p className="text-sm text-slate-600 mb-4">
                            Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
                        </p>
                        <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-xl">
                            <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48" />
                        </div>
                        <p className="text-xs text-slate-400 mt-3">Aguardando conexao...</p>
                        <div className="flex justify-center mt-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                    </div>
                )}

                {qrStatus === 'loading' && (
                    <div className="text-center py-6 text-slate-500 text-sm">
                        Verificando status...
                    </div>
                )}

                {qrStatus === 'error' && (
                    <div className="text-center py-4">
                        <p className="text-sm text-red-600 mb-3">Erro ao conectar com Z-API</p>
                        <button
                            onClick={checkWhatsAppStatus}
                            className="text-slate-600 text-sm hover:underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
                <Save size={16} />
                {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar configuracoes'}
            </button>
        </div>
    )
}