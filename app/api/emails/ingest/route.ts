import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { google } from 'googleapis';
import clientPromise from '../../../../lib/mongodb';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    if (!body.emails || !Array.isArray(body.emails)) {
      return NextResponse.json(
        { error: 'Invalid request: emails array is required' },
        { status: 400 }
      );
    }

    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    const emails = await fetchEmails(
      session.accessToken as string,
      startDate,
      endDate
    );

    // Now, call the entity extraction for these emails
    const extractionResults = await extractAndSaveEmails(emails.emails, session.user?.id);

    return NextResponse.json({ message: 'Emails ingested successfully', extractionResults });
  } catch (error: any) {
    console.error('Error during email ingestion:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
async function fetchEmails(
  accessToken: string,
  startDate: string,
  endDate: string,
  pageToken?: string
) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${startDate} before:${endDate}`,
    pageToken,
    maxResults: 50,
  });

  const messages = res.data.messages || [];
  const emailData = [];

  for (const message of messages) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: message.id!,
      format: 'full',
    });
    emailData.push(msg.data);
  }

  // Handle pagination if necessary
  if (res.data.nextPageToken) {
    const nextEmails = await fetchEmails(
      accessToken,
      startDate,
      endDate,
      res.data.nextPageToken
    );
    emailData.push(...nextEmails.emails);
  }

  return {
    emails: emailData,
    nextPageToken: res.data.nextPageToken,
  };
}

// Modify extractEntities function to accept email data
async function extractAndSaveEmails(emails: any[], userId: string | undefined) {
  const client = await clientPromise;
  const db = client.db();

  const extractionPromises = emails.map(async (email: any) => {
    const emailText = extractEmailText(email);
    const extractedData = await extractEntities(emailText);

    // Save to database
    await db.collection('emails').insertOne({
      ...extractedData,
      raw: email,
      userId: userId,
      createdAt: new Date(),
    });

    return extractedData;
  });

  const results = await Promise.all(extractionPromises);
  return results;
}

function extractEmailText(email: any): string {
  const parts = email.payload?.parts || [];
  let encodedBody = '';

  const findPlainTextPart = (parts: any[]): any => {
    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        return part;
      } else if (part.parts) {
        const found = findPlainTextPart(part.parts);
        if (found) return found;
      }
    }
    return null;
  };

  const textPart = findPlainTextPart(parts);
  if (textPart) {
    encodedBody = textPart.body?.data || '';
  } else {
    encodedBody = email.payload?.body?.data || '';
  }

  const decodedBody = Buffer.from(encodedBody, 'base64').toString('utf-8');
  return decodedBody;
}

import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY!,
});
const openai = new OpenAIApi(configuration);

async function extractEntities(emailText: string) {
  const prompt = `
Extract the following information from the email below:

- Sender name and email
- Recipient names and emails
- Date
- Subject
- Email body

Email:
"""${emailText}"""

Provide the information in the following JSON format:
{
  "sender": { "name": "", "email": "" },
  "recipients": [ { "name": "", "email": "" }, ... ],
  "date": "",
  "subject": "",
  "body": ""
}
`;

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    max_tokens: 500,
    temperature: 0,
  });

  const extractedData = JSON.parse(response.data.choices[0].text.trim());
  return extractedData;
}
