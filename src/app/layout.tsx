import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Panopter — All Documents. One Investigative Lens.',
  description:
    'Multi-document intelligence and investigation platform. Upload documents, extract information, detect inconsistencies, and generate evidence-grounded findings.',
  keywords: ['document investigation', 'forensics', 'document analysis', 'evidence'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={`${inter.className} bg-p-bg text-p-text antialiased`}>{children}</body>
    </html>
  )
}
