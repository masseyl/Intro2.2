'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Session } from 'next-auth'

interface NavbarClientProps {
  initialSession?: Session | null
}

export default function NavbarClient({ initialSession }: NavbarClientProps) {
  const { data: session } = useSession({
    required: false,
    onUnauthenticated() {
      // If no session, it will use the initialSession passed from the server component
    }
  })

  const currentSession = session || initialSession

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Gmail Social Mapper
        </Link>
        <div>
          {currentSession ? (
            <>
              <Link href="/dashboard" className="mr-4">Dashboard</Link>
              <button onClick={() => signOut()} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Sign out
              </button>
            </>
          ) : (
            <button onClick={() => signIn('google')} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
