'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { User, Settings, Shield, Eye, EyeOff, LogOut, AlertCircle } from 'lucide-react'
import { isDemoMode } from '@/lib/demo/demoData'

type TabId = 'profile' | 'preferences' | 'security'

export default function SettingsPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [tab, setTab] = useState<TabId>('profile')
  const [loading, setLoading] = useState(true)

  // Profile
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Preferences
  const [language, setLanguage] = useState('en')
  const [ocrLang, setOcrLang] = useState('eng')

  // Security
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (isDemoMode()) {
      setUserId('demo-user')
      setEmail('demo@panopter.ai')
      setFullName('Demo User')
      if (typeof window !== 'undefined') {
        setLanguage(localStorage.getItem('panopter:language') ?? 'en')
        setOcrLang(localStorage.getItem('panopter:ocr-language') ?? 'eng')
      }
      setLoading(false)
      return
    }

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setFullName(profile?.full_name ?? '')

      // Load preferences from localStorage
      if (typeof window !== 'undefined') {
        setLanguage(localStorage.getItem('panopter:language') ?? 'en')
        setOcrLang(localStorage.getItem('panopter:ocr-language') ?? 'eng')
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function saveProfile() {
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ full_name: fullName, updated_at: new Date().toISOString() }).eq('id', userId)
    setSavingProfile(false)
    if (error) addToast({ type: 'error', title: 'Failed to save profile', message: error.message })
    else addToast({ type: 'success', title: 'Profile saved' })
  }

  function savePreferences() {
    localStorage.setItem('panopter:language', language)
    localStorage.setItem('panopter:ocr-language', ocrLang)
    addToast({ type: 'success', title: 'Preferences saved' })
  }

  async function changePassword() {
    if (newPassword.length < 8) { addToast({ type: 'error', title: 'Password must be at least 8 characters' }); return }
    if (newPassword !== confirmPassword) { addToast({ type: 'error', title: 'Passwords do not match' }); return }
    setSavingPw(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPw(false)
    if (error) addToast({ type: 'error', title: 'Failed to update password', message: error.message })
    else {
      addToast({ type: 'success', title: 'Password updated' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  async function signOutAll() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  if (loading) return <PageLoader />

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Settings className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-p-text text-xl font-bold">Settings</h1>
        <p className="text-p-text-3 text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-1 bg-p-bg rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-p-surface text-p-text shadow-sm' : 'text-p-text-3 hover:text-p-text'}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="bg-p-surface border border-p-border rounded-xl p-6 space-y-5">
          <h2 className="text-p-text font-semibold">Profile Information</h2>

          <div>
            <label className="block text-p-text-2 text-sm mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text-3 cursor-not-allowed"
            />
            <p className="text-p-text-3 text-xs mt-1">Email cannot be changed from here.</p>
          </div>

          <div>
            <label className="block text-p-text-2 text-sm mb-1.5">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="px-6 py-2.5 bg-p-crimson hover:bg-p-crimson-2 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      )}

      {/* Preferences tab */}
      {tab === 'preferences' && (
        <div className="bg-p-surface border border-p-border rounded-xl p-6 space-y-5">
          <h2 className="text-p-text font-semibold">Preferences</h2>

          <div>
            <label className="block text-p-text-2 text-sm mb-1.5">Interface language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text focus:outline-none focus:border-p-crimson"
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>

          <div>
            <label className="block text-p-text-2 text-sm mb-1.5">OCR language</label>
            <select
              value={ocrLang}
              onChange={e => setOcrLang(e.target.value)}
              className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text focus:outline-none focus:border-p-crimson"
            >
              <option value="eng">English only</option>
              <option value="hin+eng">Hindi + English</option>
              <option value="eng+hin+fra">Multi-language (slower)</option>
            </select>
            <p className="text-p-text-3 text-xs mt-1">
              Used when processing scanned documents or images. Models are loaded from CDN on first use.
            </p>
          </div>

          <button
            onClick={savePreferences}
            className="px-6 py-2.5 bg-p-crimson hover:bg-p-crimson-2 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Preferences
          </button>
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="space-y-5">
          <div className="bg-p-surface border border-p-border rounded-xl p-6 space-y-5">
            <h2 className="text-p-text font-semibold">Change Password</h2>

            <div>
              <label className="block text-p-text-2 text-sm mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
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
              <label className="block text-p-text-2 text-sm mb-1.5">Confirm new password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson"
              />
            </div>

            <button
              onClick={changePassword}
              disabled={savingPw}
              className="px-6 py-2.5 bg-p-crimson hover:bg-p-crimson-2 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {savingPw ? 'Updating…' : 'Update Password'}
            </button>
          </div>

          {/* Danger zone */}
          <div className="bg-p-surface border border-p-error/30 rounded-xl p-6 space-y-4">
            <h2 className="text-p-error-2 font-semibold">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-p-text text-sm font-medium">Sign out of all devices</div>
                <div className="text-p-text-3 text-xs mt-0.5">Revokes all active sessions immediately.</div>
              </div>
              <button
                onClick={signOutAll}
                disabled={signingOut}
                className="flex items-center gap-2 px-4 py-2 bg-p-error/10 hover:bg-p-error/20 border border-p-error/30 text-p-error-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? 'Signing out…' : 'Sign Out All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
