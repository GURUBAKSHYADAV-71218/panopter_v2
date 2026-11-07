'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase sends ?code=xxx — exchange it for a session
    const code = params.get('code')
    if (!code) return
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!error) setSessionReady(true)
      else setError('Invalid or expired reset link. Please request a new one.')
    })
  }, [params])

  const hasCode = !!params.get('code')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (!hasCode) {
    return (
      <div className="text-center">
        <div className="text-p-text-3 text-sm mb-4">
          This reset link is invalid or has already been used.
        </div>
        <a href="/forgot-password" className="text-p-crimson hover:underline text-sm">
          Request a new reset link →
        </a>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-p-success/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-p-success-2" />
        </div>
        <h3 className="text-p-text font-semibold mb-2">Password updated</h3>
        <p className="text-p-text-3 text-sm">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-p-text-2 text-sm mb-1.5">New password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-p-text-3 hover:text-p-text"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-p-text-2 text-sm mb-1.5">Confirm password</label>
        <input
          type={showPw ? 'text' : 'password'}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          placeholder="Repeat your new password"
          className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson"
        />
      </div>

      {error && (
        <p className="text-p-error-2 text-sm bg-p-error/10 border border-p-error/30 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !sessionReady}
        className="w-full py-2.5 bg-p-crimson hover:bg-p-crimson-2 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
      >
        {loading ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h1 className="text-p-text text-2xl font-bold">Set new password</h1>
        <p className="text-p-text-3 text-sm mt-1">Choose a strong password for your account</p>
      </div>
      <div className="bg-p-surface border border-p-border rounded-xl p-6">
        <Suspense fallback={<div className="text-p-text-3 text-sm">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
