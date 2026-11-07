'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, Send } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormState {
  email: string
}

interface FormErrors {
  email?: string
  form?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(values: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Please enter a valid email address.'
  }
  return errors
}

function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many requests. Please wait before requesting another reset link.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  return message
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [form, setForm] = useState<FormState>({ email: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ email: e.target.value })
      setErrors({})
    },
    []
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const supabase = createClient()
      const normalizedEmail = form.email.trim().toLowerCase()
      const redirectTo = `${window.location.origin}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      })

      if (error) {
        setErrors({ form: mapSupabaseError(error.message) })
        return
      }

      // Always show success to prevent email enumeration
      setSubmittedEmail(normalizedEmail)
      setIsSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrors({ form: mapSupabaseError(message) })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="bg-p-surface border border-p-border rounded-p-xl shadow-p-lg p-8 animate-fade-in text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-p-success/30 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-p-success-2" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-p-text text-lg font-semibold mb-2">Check your inbox</h2>
        <p className="text-p-text-2 text-sm leading-relaxed">
          If an account exists for{' '}
          <span className="text-p-text font-medium">{submittedEmail}</span>, you will receive a
          password reset link shortly.
        </p>
        <p className="text-p-text-3 text-xs mt-4 leading-relaxed">
          Didn&apos;t receive it? Check your spam folder. The link expires after 1 hour.
        </p>
        <Link
          href="/login"
          className="
            inline-flex items-center gap-1.5 mt-6
            text-p-crimson hover:text-p-crimson-2
            text-sm font-medium transition-colors duration-150
          "
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-p-surface border border-p-border rounded-p-xl shadow-p-lg p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-p-text text-xl font-semibold">Reset your password</h1>
        <p className="text-p-text-3 text-sm mt-1">
          Enter your email and we&apos;ll send a secure reset link.
        </p>
      </div>

      {errors.form && (
        <div
          role="alert"
          className="flex items-start gap-2.5 bg-p-error/30 border border-p-error-2/40 text-p-error-2 text-sm rounded-p px-3.5 py-3 mb-5 animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-p-text-2 text-sm font-medium mb-1.5">
            Email address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Mail className="w-4 h-4 text-p-text-3" aria-hidden="true" />
            </span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-label="Email address"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              disabled={isLoading}
              className={`
                w-full bg-p-surface-2 border rounded-p pl-9 pr-4 py-2.5
                text-p-text text-sm placeholder:text-p-text-3
                outline-none transition-colors duration-150
                focus:border-p-crimson focus:ring-1 focus:ring-p-crimson/30
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.email ? 'border-p-error-2' : 'border-p-border hover:border-p-border-2'}
              `}
            />
          </div>
          {errors.email && (
            <p id="email-error" role="alert" className="text-p-error-2 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          aria-label="Send reset link"
          className="
            w-full flex items-center justify-center gap-2
            bg-p-crimson hover:bg-p-crimson-2
            text-white font-semibold text-sm
            rounded-p py-2.5 mt-2
            transition-colors duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-p-crimson/50
            shadow-p-sm
          "
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" aria-hidden="true" />
              Send reset link
            </>
          )}
        </button>
      </form>

      {/* Back to login */}
      <div className="flex items-center justify-center mt-6">
        <Link
          href="/login"
          className="
            inline-flex items-center gap-1.5
            text-p-text-3 hover:text-p-text-2
            text-sm transition-colors duration-150
          "
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
