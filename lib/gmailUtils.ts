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

  const userEmail = session.user?.email?.toLowerCase();
  if (!userEmail) {
    throw new Error('User email not found in session');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // First, get all messages
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${startDate} before:${endDate} in:anywhere -in:chats`,
    maxResults: 1000,
    pageToken: pageToken,
  });

  const messages = await Promise.all(
    (response.data.messages || []).map(async (message) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
        metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date'],
        fields: `id,internalDate,payload(headers(name,value),parts(mimeType,body(data)))`.replace(/\s+/g, '')
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
        recipients: allRecipients,
        to: splitRecipients(getHeader('to')),
        cc: splitRecipients(getHeader('cc')),
        bcc: splitRecipients(getHeader('bcc')),
        subject: getHeader('subject'),
        date: getHeader('date'),
        body
      };
    })
  );

  // Create maps to track sent and received emails
  const sentToEmails = new Set();
  const receivedFromEmails = new Set();

  messages.forEach(message => {
    const fromEmail = extractEmailAddress(message.from);
    const toEmails = message.recipients.map(extractEmailAddress);
    
    if (isUserEmail(fromEmail, userEmail)) {
      // If the email is from me, add all recipients
      toEmails.forEach(email => sentToEmails.add(email));
    } else {
      // If the email is to me, add the sender
      receivedFromEmails.add(fromEmail);
    }
  });

  // Filter messages to only include two-way communications
  const twoWayEmails = messages.filter(message => {
    const fromEmail = extractEmailAddress(message.from);
    const toEmails = message.recipients.map(extractEmailAddress);
    
    if (fromEmail === userEmail) {
      // If I'm the sender, keep if any recipient has sent me emails
      return toEmails.some(email => receivedFromEmails.has(email));
    } else {
      // If I'm the recipient, keep if I've sent emails to this sender
      return sentToEmails.has(fromEmail);
    }
  });

  return {
    messages: twoWayEmails,
    nextPageToken: response.data.nextPageToken,
  };
}

// Helper functions
function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<(.+?)>/) || emailString.match(/([^\s]+@[^\s]+)/);
  return match ? match[1].toLowerCase() : emailString.toLowerCase();
}

// Updated to use session email
function isUserEmail(email: string, userEmail: string): boolean {
  return email.toLowerCase() === userEmail.toLowerCase();
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