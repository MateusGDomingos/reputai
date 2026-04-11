'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, TrendingUp, MessageSquare, ThumbsDown } from 'lucide-react'

type Review = {
    id: string
    source: string
    author_name: string | null
    stars: number
    body: string | null
    sentiment: string | null
    review_date: string | null
    created_at: string
}

type FeedbackRequest = {
    id: string
    stars_given: number | null
    feedback_text: string | null
    sent_at: string
    contacts: { name: string } | null
}

export default function ReviewsPage() {
    const supabase = createClient()

    const [reviews, setReviews] = useState<Review[]>([])
    const [feedbacks, setFeedbacks] = useState<FeedbackRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'feedbacks' | 'reviews'>('feedbacks')

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

        const tid = profile?.tenant_id

        const [{ data: r }, { data: f }] = await Promise.all([
            supabase
                .from('reviews')
                .select('*')
                .eq('tenant_id', tid)
                .order('created_at', { ascending: false }),
            supabase
                .from('review_requests')
                .select('id, stars_given, feedback_text, sent_at, contacts(name)')
                .eq('tenant_id', tid)
                .not('feedback_text', 'is', null)
                .order('sent_at', { ascending: false }),
        ])

        setReviews(r || [])
        setFeedbacks((f as any) || [])
        setLoading(false)
    }

    function Stars({ count }: { count: number }) {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                    <Star
                        key={i}
                        size={14}
                        className={i <= count ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
                    />
                ))}
            </div>
        )
    }

    function sentimentBadge(sentiment: string | null) {
        if (!sentiment) return null
        const map: Record<string, string> = {
            positive: 'bg-green-100 text-green-700',
            neutral: 'bg-slate-100 text-slate-600',
            negative: 'bg-red-100 text-red-700',
        }
        const labels: Record<string, string> = {
            positive: 'Positivo',
            neutral: 'Neutro',
            negative: 'Negativo',
        }
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[sentiment] || map.neutral}`}>
                {labels[sentiment] || sentiment}
            </span>
        )
    }

    const negativeFeedbacks = feedbacks.filter(f => (f.stars_given || 0) <= 3)
    const avgStars = feedbacks.length
        ? (feedbacks.reduce((acc, f) => acc + (f.stars_given || 0), 0) / feedbacks.length).toFixed(1)
        : '0'

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Reviews</h2>
                <p className="text-slate-500 mt-1">Monitore a reputacao do seu cliente</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Star size={16} className="text-amber-600" />
                        </div>
                        <p className="text-sm text-slate-500">Media de estrelas</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{avgStars}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <MessageSquare size={16} className="text-blue-600" />
                        </div>
                        <p className="text-sm text-slate-500">Feedbacks recebidos</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{feedbacks.length}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                            <ThumbsDown size={16} className="text-red-600" />
                        </div>
                        <p className="text-sm text-slate-500">Feedbacks negativos</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{negativeFeedbacks.length}</p>
                </div>
            </div>

            <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setTab('feedbacks')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'feedbacks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Feedbacks internos
                </button>
                <button
                    onClick={() => setTab('reviews')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'reviews' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Reviews Google
                </button>
            </div>

            {tab === 'feedbacks' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Carregando...</div>
                    ) : feedbacks.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-slate-500 text-sm">Nenhum feedback recebido ainda.</p>
                            <p className="text-slate-400 text-xs mt-1">Os feedbacks negativos capturados aparecem aqui.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {feedbacks.map(f => (
                                <div key={f.id} className="p-5">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">
                                                {(f.contacts as any)?.name || 'Anonimo'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(f.sent_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        {f.stars_given && <Stars count={f.stars_given} />}
                                    </div>
                                    {f.feedback_text && (
                                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 mt-2">
                                            {f.feedback_text}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'reviews' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Carregando...</div>
                    ) : reviews.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-slate-500 text-sm">Nenhum review do Google importado ainda.</p>
                            <p className="text-slate-400 text-xs mt-1">Em breve: monitoramento automatico do Google.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {reviews.map(r => (
                                <div key={r.id} className="p-5">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{r.author_name || 'Anonimo'}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {r.review_date ? new Date(r.review_date).toLocaleDateString('pt-BR') : '-'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {r.stars && <Stars count={r.stars} />}
                                            {sentimentBadge(r.sentiment)}
                                        </div>
                                    </div>
                                    {r.body && (
                                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 mt-2">
                                            {r.body}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}