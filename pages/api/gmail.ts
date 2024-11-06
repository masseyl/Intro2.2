import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth/[...nextauth]"
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
      access_token: session.accessToken,
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Fetch sent emails (you'll need to implement pagination for a real-world scenario)
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:sent',
      maxResults: 100,
    })

    const messages = response.data.messages || []

    // Process messages to extract contacts and analyze relationships
    // This is a placeholder - you'll need to implement the actual logic
    const contacts = messages.map(message => ({
      id: message.id,
      // Add more properties as needed
    }))

    res.status(200).json({ contacts })
  } catch (error) {
    console.error('Error fetching Gmail data:', error)
    res.status(500).json({ error: 'Failed to fetch Gmail data' })
  }
}
