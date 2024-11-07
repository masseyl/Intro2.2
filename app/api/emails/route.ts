import { NextResponse } from 'next/server'
import { getSentEmails } from '../../../lib/gmailUtils'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET(request: Request) {
  // Check authentication first
  const session = await getServerSession(authOptions)
  
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const pageToken = searchParams.get('pageToken')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Start and end dates are required' },
      { status: 400 }
    )
  }

  try {
    const emails = await getSentEmails(
      startDate, 
      endDate, 
      pageToken || undefined,
      session.accessToken
    )
    return NextResponse.json(emails)
  } catch (error: any) {
    console.error('Error fetching emails:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 