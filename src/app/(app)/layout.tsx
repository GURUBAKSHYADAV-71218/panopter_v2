import { redirect } from 'next/navigation'
import { createClient, isDemoMode } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // In demo mode, skip auth entirely and use a demo user
  if (isDemoMode()) {
    const demoUser = {
      id: 'demo-user',
      email: 'demo@panopter.ai',
      full_name: 'Demo User',
    }
    return (
      <AppShell user={demoUser} demoMode>
        {children}
      </AppShell>
    )
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile for full_name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const appUser = {
    id: user.id,
    email: user.email ?? '',
    full_name: (profile as { full_name: string | null } | null)?.full_name ?? null,
  }

  return <AppShell user={appUser}>{children}</AppShell>
}
