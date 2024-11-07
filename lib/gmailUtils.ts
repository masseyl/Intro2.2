import { google } from 'googleapis'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../app/api/auth/[...nextauth]/route'

interface EmailMessage {
  id: string
  date: string
  to: string
  subject: string
  snippet: string
}

interface GmailMessage {
  id: string;
  threadId?: string;
  payload?: {
    headers: {
      name: string;
      value: string;
    }[];
  };
  thread?: any; // Type could be more specific based on your needs
}

async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials.access_token
}

export async function getSentEmails(
  startDate: string,
  endDate: string,
  pageToken?: string
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // First, get the list of message IDs
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${startDate} before:${endDate}`,
    maxResults: 10,
    pageToken: pageToken,
  });

  // Then, fetch the full content of each thread
  const messages = await Promise.all(
    (response.data.messages || []).map(async (message) => {
      // Get the thread ID first
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });

      // If there's a thread ID, fetch the entire thread
      if (fullMessage.data.threadId) {
        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: fullMessage.data.threadId,
          format: 'full',
        });
        
        // Return the thread with all messages
        return {
          ...fullMessage.data,
          thread: thread.data,
        };
      }

      // If no thread ID, just return the message
      return fullMessage.data;
    })
  );

  return {
    messages,
    nextPageToken: response.data.nextPageToken,
  };
}

function isAccessTokenExpired(token: string) {
  try {
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
    return Date.now() >= decodedPayload.exp * 1000;
  } catch {
    // If token can't be decoded, assume it's expired
    return true;
  }
}

// Define the session interface
interface Session {
  user?: {
    accessToken?: string;
  };
}

// Use the interface in the getToken function
async function getToken() {
  const session: Session | null = await getServerSession(authOptions);
  if (!session || !session.user?.accessToken) {
    throw new Error('Not authenticated');
  }
  return session.user.accessToken;
}