import { createBrowserClient } from '@supabase/ssr'

// ─── Demo-mode stub ───────────────────────────────────────────────────────────
// When Supabase credentials are absent, return a stub so pages that guard with
// isDemoMode() early don't crash on import. Pages MUST check isDemoMode()
// BEFORE calling any method on this stub that accesses the database.

type AnyFn = (...args: unknown[]) => unknown

function makeQuery(): Record<string, AnyFn> {
  const q: Record<string, AnyFn> = {
    select: () => makeQuery(),
    insert: () => makeQuery(),
    update: () => makeQuery(),
    delete: () => makeQuery(),
    upsert: () => makeQuery(),
    eq: () => makeQuery(),
    neq: () => makeQuery(),
    in: () => makeQuery(),
    order: () => makeQuery(),
    limit: () => makeQuery(),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () => Promise.resolve({ data: null, error: null, count: 0 }),
  }
  return q
}

function createDemoClientStub() {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () =>
        Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: (_table: string) => makeQuery(),
  }
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return createDemoClientStub() as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
