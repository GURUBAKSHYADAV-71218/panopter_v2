import { createClient, isDemoMode } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // In demo mode (no Supabase credentials), just redirect to dashboard
  if (isDemoMode()) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  if (code) {
    const supabase = await createClient()
    // exchangeCodeForSession exists on the real client only
    const authClient = supabase.auth as unknown as {
      exchangeCodeForSession: (code: string) => Promise<{ error: unknown }>
    }
    const { error } = await authClient.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
