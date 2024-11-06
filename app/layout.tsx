import './globals.css'
import { Inter } from 'next/font/google'
import Navbar from '@/components/Navbar'
import { Providers } from '@/lib/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Gmail Social Mapper',
  description: 'Analyze and map your social connections from Gmail',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
