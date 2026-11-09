import { AppShell } from '@/components/layout/AppShell'

// App layout — no authentication required.
const APP_USER = {
  id: 'local-user',
  email: 'user@panopter.local',
  full_name: 'Panopter User',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell user={APP_USER}>
      {children}
    </AppShell>
  )
}
