import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Demo-mode stub ───────────────────────────────────────────────────────────
// When Supabase credentials are not configured we return a minimal stub so
// server components can still render without crashing.

function createDemoStub() {
  const noopQuery = {
    select: () => noopQuery,
    insert: () => noopQuery,
    update: () => noopQuery,
    delete: () => noopQuery,
    upsert: () => noopQuery,
    eq: () => noopQuery,
    neq: () => noopQuery,
    order: () => noopQuery,
    limit: () => noopQuery,
    single: () => Promise.resolve({ data: null, error: null, count: 0 }),
    then: (resolve: (v: { data: null; error: null; count: number }) => unknown) =>
      Promise.resolve(resolve({ data: null, error: null, count: 0 })),
  }

  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: (_table: string) => noopQuery,
  }
}

export function isDemoMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url === 'your-project-url' || url.includes('placeholder')
}

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return createDemoStub() as unknown as ReturnType<typeof createServerClient>
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server component — cookie setting may fail, which is expected
        }
      },
    },
  })
}
