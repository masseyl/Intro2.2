import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Gmail Social Mapper
        </Link>
        <div>
          {session ? (
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
