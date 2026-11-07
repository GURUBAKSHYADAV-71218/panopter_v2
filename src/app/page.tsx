import { redirect } from 'next/navigation'

// Root page — middleware handles the redirect, but this is a safety fallback
export default function HomePage() {
  redirect('/login')
}
