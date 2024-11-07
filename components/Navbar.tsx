'use client'

import NavbarClient from './NavbarClient'
import { useSession } from 'next-auth/react'

export default function Navbar() {
  const { data: session } = useSession()
  
  return <NavbarClient initialSession={session} />
}
