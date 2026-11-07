import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Panopter – Authentication',
  description: 'Sign in to Panopter, the enterprise document intelligence platform.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-p-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Panopter brand header */}
      <div className="mb-8 flex flex-col items-center gap-2 select-none">
        {/* Logo mark */}
        <div className="w-12 h-12 rounded-p-lg bg-p-accent flex items-center justify-center shadow-p-glow">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Eye / lens shape */}
            <ellipse cx="14" cy="14" rx="12" ry="8" stroke="#f0eae8" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="4.5" fill="#c0334d" />
            <circle cx="14" cy="14" r="2" fill="#f0eae8" opacity="0.9" />
          </svg>
        </div>
        <span className="text-p-text font-bold text-2xl tracking-tight">Panopter</span>
        <span className="text-p-text-3 text-xs tracking-widest uppercase">
          Document Intelligence
        </span>
      </div>

      {/* Page card */}
      <main className="w-full max-w-md">{children}</main>

      {/* Footer */}
      <footer className="mt-10 text-p-text-3 text-xs text-center">
        <p>
          &copy; {new Date().getFullYear()} Panopter.{' '}
          <Link
            href="/privacy"
            className="hover:text-p-text-2 transition-colors duration-150 underline underline-offset-2"
          >
            Privacy
          </Link>{' '}
          &middot;{' '}
          <Link
            href="/terms"
            className="hover:text-p-text-2 transition-colors duration-150 underline underline-offset-2"
          >
            Terms
          </Link>
        </p>
      </footer>
    </div>
  )
}
