'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AuthNav() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/' 
    })
  }

  const handleSignIn = () => {
    signIn('google', { 
      callbackUrl: '/dashboard' 
    })
  }

  if (status === 'loading') {
    return <div className="animate-pulse">Loading...</div>
  }

  return (
    <div className="flex items-center gap-4">
      {session ? (
        <>
          <div className="flex items-center gap-2">
            {session.user?.image && (
              <img 
                src={session.user.image} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-gray-700">
              {session.user?.name}
            </span>
          </div>
          <div className="flex gap-2">
            <Link 
              href="/dashboard"
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={handleSignIn}
          className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Sign In with Google
        </button>
      )}
    </div>
  )
} 
