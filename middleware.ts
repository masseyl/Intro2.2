import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token?.accessToken
      }
    },
    pages: {
      signIn: '/auth/signin'
    }
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/emails/:path*',
    '/api/relationships/:path*'
  ]
} 