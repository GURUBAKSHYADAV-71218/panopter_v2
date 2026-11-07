'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn, FlaskConical } from 'lucide-react'
import { isDemoMode } from '@/lib/demo/demoData'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormState {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
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

  if (!values.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (lower.includes('email not confirmed') || lower.includes('confirm your email')) {
    return 'Please confirm your email address before signing in. Check your inbox.'
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many sign-in attempts. Please wait a moment and try again.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  return message
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>({ email: '', password: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const demo = isDemoMode()

  // Handle field changes — clear per-field error on edit
  const handleChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
    },
    []
  )

  const handleDemoMode = async () => {
    setIsDemoLoading(true)
    // Small delay for UX
    await new Promise(r => setTimeout(r, 300))
    router.push('/dashboard')
  }

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
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })

      if (error) {
        setErrors({ form: mapSupabaseError(error.message) })
        return
      }

      // Refresh server state then navigate
      router.refresh()
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrors({ form: mapSupabaseError(message) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-p-surface border border-p-border rounded-p-xl shadow-p-lg p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-p-text text-xl font-semibold">Sign in to your account</h1>
        <p className="text-p-text-3 text-sm mt-1">
          Welcome back. Enter your credentials to continue.
        </p>
      </div>

      {/* Form-level error banner */}
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
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-p-text-2 text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              tabIndex={0}
              className="text-p-text-3 text-xs hover:text-p-crimson transition-colors duration-150"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lock className="w-4 h-4 text-p-text-3" aria-hidden="true" />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-label="Password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              value={form.password}
              onChange={handleChange('password')}
              placeholder="••••••••"
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
          {errors.password && (
            <p id="password-error" role="alert" className="text-p-error-2 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          aria-label="Sign in"
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
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Sign in
            </>
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="text-p-text-3 text-sm text-center mt-6">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-p-crimson hover:text-p-crimson-2 font-medium transition-colors duration-150"
        >
          Create one
        </Link>
      </p>

      {/* Demo mode entry — shown when Supabase is not configured */}
      {demo && (
        <div className="mt-5 pt-5 border-t border-p-border">
          <p className="text-p-text-3 text-xs text-center mb-3">
            No Supabase credentials detected — explore the demo instead:
          </p>
          <button
            type="button"
            onClick={handleDemoMode}
            disabled={isDemoLoading}
            className="w-full flex items-center justify-center gap-2 border border-amber-700/50 bg-amber-900/20 hover:bg-amber-900/40 text-amber-300 text-sm font-medium rounded-p py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FlaskConical className="w-4 h-4" aria-hidden="true" />
            {isDemoLoading ? 'Entering demo…' : 'Enter Demo Mode'}
          </button>
        </div>
      )}
    </div>
  )
}
