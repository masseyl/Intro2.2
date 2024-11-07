import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import clientPromise from '../../../../lib/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper function to clean JSON response
function cleanJsonResponse(content: string): string {
  return content
    .replace(/```json\s*/g, '')
    .replace(/```\s*$/g, '')
    .replace(/^```\s*/g, '')
    .trim();
}

// Type definition
type EmailParticipant = {
  name: string;
  email: string;
};

// Helper function to extract unique participants
function extractUniqueParticipants(emails: any[]): EmailParticipant[] {
  const participantsMap = new Map<string, EmailParticipant>();
  
  emails.forEach(email => {
    if (email.sender?.email) {
      participantsMap.set(email.sender.email, {
        name: email.sender.name || 'Unknown',
        email: email.sender.email
      });
    }
    
    if (Array.isArray(email.recipients)) {
      email.recipients.forEach((recipient: any) => {
        if (recipient.email) {
          participantsMap.set(recipient.email, {
            name: recipient.name || 'Unknown',
            email: recipient.email
          });
        }
      });
    }
  });
  
  return Array.from(participantsMap.values());
}

// Fetch both sent and inbox emails
async function getSentEmails(startDate: string, endDate: string) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection('emails')
    .find({
      type: 'sent',
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    })
    .toArray();
}

async function getInboxEmails(startDate: string, endDate: string) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection('emails')
    .find({
      type: 'inbox',
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    })
    .toArray();
}

async function getEmails(startDate: string, endDate: string) {
  const sentEmails = await getSentEmails(startDate, endDate);
  const inboxEmails = await getInboxEmails(startDate, endDate);
  return [...sentEmails, ...inboxEmails];
}

// Main profile generation function
async function generateAllProfiles(participants: EmailParticipant[], emailsByPerson: Map<string, any[]>) {
  const profiles = [];

  for (const participant of participants) {
    const emails = emailsByPerson.get(participant.email) || [];
    if (emails.length === 0) continue;

    const allEmailsInThread = emails.flatMap(email => {
      const threadEmails = [email];
      if (Array.isArray(email.recipients)) {
        email.recipients.forEach(recipient => {
          const recipientEmails = emailsByPerson.get(recipient.email) || [];
          threadEmails.push(...recipientEmails);
        });
      }
      return threadEmails;
    });

    const limitedEmails = allEmailsInThread.slice(0, 5);
    const prompt = `
Analyze the following emails from ${participant.name} <${participant.email}> and their recipients.
Create a profile based on their communication style and content.

Emails:
${limitedEmails.map(email => `
Subject: ${email.subject}
Body: ${email.body}
`).join('\n---\n')}

Return a JSON profile with this format:
{
  "name": "${participant.name}",
  "email": "${participant.email}",
  "profile": {
    "characteristics": "brief personality description",
    "demeanor": "communication tone",
    "interests": ["3-5 key interests"],
    "communication_style": "brief description"
  }
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert communication analyst. Return only valid JSON without markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const profile = JSON.parse(cleanJsonResponse(response.choices[0].message?.content || '{}'));
      profiles.push(profile);
    } catch (error) {
      console.error(`Error generating profile for ${participant.email}:`, error);
    }
  }

  return profiles;
}

// Main route handler
export async function POST(request: Request) {
  try {
    const { emails, startDate, endDate } = await request.json();
    const results = await getEmails(startDate, endDate);
    const participants = extractUniqueParticipants(results);
    const emailsByPerson = new Map(
      participants.map(p => [p.email, results.filter(e => e.sender.email === p.email)])
    );
    const profiles = await generateAllProfiles(participants, emailsByPerson);
    
    return NextResponse.json({ success: true, data: profiles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
