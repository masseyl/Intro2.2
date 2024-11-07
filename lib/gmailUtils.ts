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

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${startDate} before:${endDate} in:sent -in:chats`,
    maxResults: 25,
    pageToken: pageToken,
  });

  const messages = await Promise.all(
    (response.data.messages || []).map(async (message) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
        metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date'],
        fields: `
          id,
          internalDate,
          payload(
            headers(name,value),
            parts(mimeType,body(data))
          )
        `.replace(/\s+/g, '')
      });
      
      const headers = fullMessage.data.payload?.headers || [];
      const getHeader = (name: string) => 
        headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      
      // Split recipients on commas
      const splitRecipients = (headerValue: string) => 
        headerValue ? headerValue.split(',').map(r => r.trim()) : [];

      // Get all recipients in a single array
      const allRecipients = [
        ...splitRecipients(getHeader('to')),
        ...splitRecipients(getHeader('cc')),
        ...splitRecipients(getHeader('bcc'))
      ];

      // Get the text/plain part
      const textPart = fullMessage.data.payload?.parts?.find(
        (part: any) => part.mimeType === 'text/plain'
      );
      
      const body = textPart?.body?.data 
        ? Buffer.from(textPart.body.data, 'base64').toString('utf-8')
        : '';

      return {
        id: fullMessage.data.id,
        from: getHeader('from'),
        recipients: allRecipients, // All recipients in one array
        // Keep individual fields for reference if needed
        to: splitRecipients(getHeader('to')),
        cc: splitRecipients(getHeader('cc')),
        bcc: splitRecipients(getHeader('bcc')),
        subject: getHeader('subject'),
        date: getHeader('date'),
        body
      };
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

export async function fetchEmails(session: any, maxResults: number = 10) {
  const gmail = google.gmail({ version: 'v1', auth: await getGmailClient(session) });
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['SENT'],
    q: 'in:sent', // Double ensure we only get sent mail
  });

  const messages = await Promise.all(
    (response.data.messages || []).map(async (message) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
        // Only get the fields we actually need
        fields: `
          id,
          threadId,
          internalDate,
          payload(
            headers(name,value),
            body(data),
            parts(mimeType,body(data)))
          )
        `.replace(/\s+/g, ''),
      });
      
      return fullMessage.data;
    })
  );

  return {
    messages,
    nextPageToken: response.data.nextPageToken,
  };
}