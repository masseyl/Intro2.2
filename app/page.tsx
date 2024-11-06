import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import Link from "next/link"

export default async function Home() {
  const session = await getServerSession(authOptions)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Welcome to Gmail Social Mapper</h1>
      {session ? (
        <Link href="/dashboard" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Go to Dashboard
        </Link>
      ) : (
        <Link href="/api/auth/signin" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Sign in with Google
        </Link>
      )}
    </div>
  )
}
