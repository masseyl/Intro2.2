'use client'

import { signOut } from 'next-auth/react'

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function UserProfile({ user }: { user: User }) {
  return (
    <div className="p-6 flex items-center justify-between bg-white shadow rounded-lg">
      <div className="flex items-center space-x-4">
        {user.image && (
          <img
            src={user.image}
            alt={user.name || 'User'}
            className="h-16 w-16 rounded-full"
          />
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-gray-600">{user.email}</p>
        </div>
      </div>
      <button
        onClick={() => signOut()}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Sign Out
      </button>
    </div>
  )
}
