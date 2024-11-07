import { Providers } from '../lib/providers'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import { Inter } from 'next/font/google'
import { ReactNode } from 'react'
import AuthNav from '../components/AuthNav'
import Link from 'next/link'
import './globals.css';

const inter = Inter({ subsets: ['latin'] })

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <Providers session={session}>
          <div className="min-h-screen flex flex-col">
            <header className="bg-white shadow">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold text-purple-600">
                  Gmail Social Mapper
                </Link>
                <AuthNav />
              </div>
            </header>
            <main className="flex-grow">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
