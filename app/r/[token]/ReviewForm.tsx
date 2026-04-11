'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

type Props = {
  requestId: string
  tenantName: string
  googleReviewUrl: string | null
}

export default function ReviewForm({ requestId, tenantName, googleReviewUrl }: Props) {
  const [step, setStep] = useState<'stars' | 'feedback' | 'done'>('stars')
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleStars(value: number) {
    setStars(value)

    if (value >= 4 && googleReviewUrl) {
      await saveReview(value, null)
      window.location.assign(googleReviewUrl)
      return
    }

    setStep('feedback')
  }

  async function saveReview(starsValue: number, feedbackText: string | null) {
    setSaving(true)
    await fetch('/api/reviews/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        stars: starsValue,
        feedback: feedbackText,
      }),
    })
    setSaving(false)
  }

  async function handleSubmitFeedback() {
    await saveReview(stars, feedback)
    setStep('done')
  }

  const starLabels = ['', 'Pessimo', 'Ruim', 'Regular', 'Bom', 'Excelente']

  if (step === 'done') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🙏</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Obrigado pelo feedback!</h2>
        <p className="text-slate-500 text-sm">
          Sua opiniao e muito importante para melhorarmos nosso atendimento.
        </p>
      </div>
    )
  }

  if (step === 'feedback') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">😔</div>
          <h2 className="text-xl font-bold text-slate-900">Sentimos muito</h2>
          <p className="text-slate-500 text-sm mt-1">
            Conte o que aconteceu para que possamos melhorar
          </p>
        </div>

        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              size={24}
              className={i <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
            />
          ))}
        </div>

        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={4}
          placeholder="Descreva sua experiencia..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none mb-4"
        />

        <button
          onClick={handleSubmitFeedback}
          disabled={saving || !feedback.trim()}
          className="w-full bg-slate-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Enviando...' : 'Enviar feedback'}
        </button>

        <p className="text-xs text-slate-400 text-center mt-3">
          Seu feedback sera enviado diretamente para a equipe
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">⭐</div>
        <h2 className="text-xl font-bold text-slate-900">
          Como foi sua experiencia em {tenantName}?
        </h2>
        <p className="text-slate-500 text-sm mt-2">
          Toque nas estrelas para avaliar
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => handleStars(i)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={40}
              className={
                i <= (hover || stars)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-200 fill-slate-200'
              }
            />
          </button>
        ))}
      </div>

      {(hover || stars) > 0 && (
        <p className="text-center text-sm font-medium text-slate-600">
          {starLabels[hover || stars]}
        </p>
      )}

      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          {stars >= 4 || hover >= 4
            ? 'Voce sera redirecionado para o Google'
            : 'Seu feedback fica privado conosco'}
        </p>
      </div>
    </div>
  )
}
