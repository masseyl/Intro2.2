import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

interface CustomSession extends Session {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id?: string | null;
    accessToken?: string;
  };
  accessToken?: string;
}

export async function getToken() {
  const session = await getServerSession(authOptions) as CustomSession;
  
  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }

  return session.accessToken;
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials.access_token;
} 
