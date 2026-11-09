import { type NextRequest, NextResponse } from 'next/server'

// No authentication middleware — app is fully open.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|models|images|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
