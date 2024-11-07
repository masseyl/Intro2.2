import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import clientPromise from '../../../../lib/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Debug log
  console.log("Session in API:", session);
  
  if (!session?.accessToken) {
    console.log("No access token found in session");
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

    const { emails } = body;

    const extractionPromises = emails.map(async (email: any) => {
      const emailText = extractEmailText(email);
      const extractedData = await extractEntities(emailText);

      // Save to database
      const client = await clientPromise;
      const db = client.db();
      await db.collection('emails').insertOne({
        ...extractedData,
        raw: email,
        userId: session.user?.id,
      });

      return extractedData;
    });

    const results = await Promise.all(extractionPromises);
    return NextResponse.json({ results });
    
  } catch (error: any) {
    console.error('Error during entity extraction:', error);
    return NextResponse.json(
      { error: 'Failed to process emails: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function extractEmailText(email: any): string {
  // If this is a threaded message, combine all messages in the thread
  if (email.thread && email.thread.messages) {
    return email.thread.messages
      .map((message: any) => {
        const parts = message.payload?.parts || [];
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
          encodedBody = message.payload?.body?.data || '';
        }

        const decodedBody = Buffer.from(encodedBody || '', 'base64').toString('utf-8');
        return decodedBody;
      })
      .join('\n\n--- Next Message ---\n\n');
  }

  // If not a thread, process as single message
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

  const decodedBody = Buffer.from(encodedBody || '', 'base64').toString('utf-8');
  return decodedBody;
}

async function extractEntities(emailText: string) {
  const prompt = `
Extract the following information from the email below. Return ONLY valid JSON with this exact structure:
{
  "sender": { "name": "", "email": "" },
  "recipients": [ { "name": "", "email": "" } ],
  "date": "",
  "subject": "",
  "body": ""
}

Email:
${emailText}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful assistant that extracts email information and returns it in valid JSON format only. Remove any markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0,
      response_format: { type: "json_object" } // Force JSON response
    });

    const content = response.choices[0].message?.content?.trim() || '{}';
    
    try {
      // Clean the content string
      const cleanContent = content
        .replace(/^```json\s*/, '') // Remove leading ```json
        .replace(/\s*```$/, '')     // Remove trailing ```
        .trim();
      
      const parsed = JSON.parse(cleanContent);
      
      // Ensure all required fields exist
      return {
        sender: parsed.sender || { name: '', email: '' },
        recipients: Array.isArray(parsed.recipients) ? parsed.recipients : [],
        date: parsed.date || '',
        subject: parsed.subject || '',
        body: parsed.body || emailText
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Return a valid fallback object
      return {
        sender: { name: '', email: '' },
        recipients: [],
        date: '',
        subject: '',
        body: emailText
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to process email content');
  }
}
