'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignIn() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const callbackUrl = searchParams?.get('callbackUrl') ?? '/dashboard'
  const error_param = searchParams?.get('error')

  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const result = await signIn('google', {
        callbackUrl,
        redirect: false
      })

      if (result?.error) {
        setError('Failed to sign in with Google')
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {(error || error_param) && (
            <div className="mt-2 p-2 text-center text-sm text-red-600 bg-red-100 rounded">
              {error || 'Authentication failed. Please try again.'}
            </div>
          )}
        </div>
        <div>
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in with Google'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
