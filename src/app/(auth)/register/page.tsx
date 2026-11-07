'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, CheckCircle2, UserPlus } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormState {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
  form?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(values: FormState): FormErrors {
  const errors: FormErrors = {}

  if (!values.fullName.trim()) {
    errors.fullName = 'Full name is required.'
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.'
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (lower.includes('password') && lower.includes('weak')) {
    return 'Please choose a stronger password.'
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a moment before trying again.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  return message
}

// Password strength helper
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-p-error-2' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-p-warning-2' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-p-info-2' }
  return { score, label: 'Strong', color: 'bg-p-success-2' }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const handleChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
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
      const trimmedName = form.fullName.trim()

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: form.password,
        options: {
          data: { full_name: trimmedName },
        },
      })

      if (error) {
        setErrors({ form: mapSupabaseError(error.message) })
        return
      }

      // If user object returned, attempt to insert profile row
      if (data.user) {
        // Insert profile — ignore conflict (row may already exist via trigger)
        await supabase.from('profiles').upsert(
          { id: data.user.id, full_name: trimmedName },
          { onConflict: 'id', ignoreDuplicates: true }
        )
      }

      setSubmittedEmail(normalizedEmail)
      setIsSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrors({ form: mapSupabaseError(message) })
    } finally {
      setIsLoading(false)
    }
  }

  const strength = getPasswordStrength(form.password)

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
          We sent a confirmation link to{' '}
          <span className="text-p-text font-medium">{submittedEmail}</span>. Click the link in that
          email to activate your account.
        </p>
        <p className="text-p-text-3 text-xs mt-4">
          Didn&apos;t receive it? Check your spam folder or{' '}
          <Link
            href="/login"
            className="text-p-crimson hover:text-p-crimson-2 transition-colors duration-150"
          >
            return to sign in
          </Link>
          .
        </p>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-p-surface border border-p-border rounded-p-xl shadow-p-lg p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-p-text text-xl font-semibold">Create your account</h1>
        <p className="text-p-text-3 text-sm mt-1">
          Get started with Panopter&apos;s document intelligence platform.
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
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-p-text-2 text-sm font-medium mb-1.5">
            Full name
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <User className="w-4 h-4 text-p-text-3" aria-hidden="true" />
            </span>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              aria-label="Full name"
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              value={form.fullName}
              onChange={handleChange('fullName')}
              placeholder="Jane Doe"
              disabled={isLoading}
              className={`
                w-full bg-p-surface-2 border rounded-p pl-9 pr-4 py-2.5
                text-p-text text-sm placeholder:text-p-text-3
                outline-none transition-colors duration-150
                focus:border-p-crimson focus:ring-1 focus:ring-p-crimson/30
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.fullName ? 'border-p-error-2' : 'border-p-border hover:border-p-border-2'}
              `}
            />
          </div>
          {errors.fullName && (
            <p id="fullName-error" role="alert" className="text-p-error-2 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
              {errors.fullName}
            </p>
          )}
        </div>

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
              onChange={handleChange('email')}
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

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-p-text-2 text-sm font-medium mb-1.5">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lock className="w-4 h-4 text-p-text-3" aria-hidden="true" />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-label="Password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : 'password-hint'}
              value={form.password}
              onChange={handleChange('password')}
              placeholder="Min. 8 characters"
              disabled={isLoading}
              className={`
                w-full bg-p-surface-2 border rounded-p pl-9 pr-10 py-2.5
                text-p-text text-sm placeholder:text-p-text-3
                outline-none transition-colors duration-150
                focus:border-p-crimson focus:ring-1 focus:ring-p-crimson/30
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.password ? 'border-p-error-2' : 'border-p-border hover:border-p-border-2'}
              `}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-p-text-3 hover:text-p-text-2 transition-colors duration-150"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {/* Password strength bar */}
          {form.password && (
            <div className="mt-1.5" aria-live="polite" aria-label={`Password strength: ${strength.label}`}>
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                      i <= strength.score ? strength.color : 'bg-p-border'
                    }`}
                  />
                ))}
              </div>
              <p id="password-hint" className="text-p-text-3 text-xs">
                Strength:{' '}
                <span
                  className={
                    strength.score <= 1
                      ? 'text-p-error-2'
                      : strength.score <= 2
                      ? 'text-p-warning-2'
                      : strength.score <= 3
                      ? 'text-p-info-2'
                      : 'text-p-success-2'
                  }
                >
                  {strength.label}
                </span>
              </p>
            </div>
          )}
          {errors.password && (
            <p id="password-error" role="alert" className="text-p-error-2 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-p-text-2 text-sm font-medium mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lock className="w-4 h-4 text-p-text-3" aria-hidden="true" />
            </span>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-label="Confirm password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              placeholder="Repeat your password"
              disabled={isLoading}
              className={`
                w-full bg-p-surface-2 border rounded-p pl-9 pr-10 py-2.5
                text-p-text text-sm placeholder:text-p-text-3
                outline-none transition-colors duration-150
                focus:border-p-crimson focus:ring-1 focus:ring-p-crimson/30
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.confirmPassword ? 'border-p-error-2' : 'border-p-border hover:border-p-border-2'}
              `}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-p-text-3 hover:text-p-text-2 transition-colors duration-150"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirmPassword-error" role="alert" className="text-p-error-2 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          aria-label="Create account"
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
              Creating account…
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              Create account
            </>
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="text-p-text-3 text-sm text-center mt-6">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-p-crimson hover:text-p-crimson-2 font-medium transition-colors duration-150"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
