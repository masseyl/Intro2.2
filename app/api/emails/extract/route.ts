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

// Add this helper function
function getSenderInfo(email: any) {
  const from = email.from || '';
  const matches = from.match(/(.*?)\s*<(.+?)>/) || ['', '', from];
  return {
    name: matches[1].trim() || from.split('@')[0] || 'Unknown',
    email: matches[2] || from
  };
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
        model: 'gpt-4o',
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
    const { emails } = await request.json();
    
    // Group emails by sender
    const emailsByPerson = new Map();
    emails.forEach(email => {
      const senderEmail = email.from;
      if (!emailsByPerson.has(senderEmail)) {
        emailsByPerson.set(senderEmail, []);
      }
      emailsByPerson.get(senderEmail).push(email);
    });

    // Generate profiles for each person
    const profiles = [];
    for (const [email, personEmails] of emailsByPerson) {
      try {
        // Chunk emails into smaller batches
        const CHUNK_SIZE = 5; // Adjust based on average email size
        const emailChunks = [];
        for (let i = 0; i < personEmails.length; i += CHUNK_SIZE) {
          emailChunks.push(personEmails.slice(i, i + CHUNK_SIZE));
        }

        // Process each chunk and collect insights
        const chunkInsights = [];
        for (const chunk of emailChunks) {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are an expert communication analyst. Return only valid JSON without markdown.'
              },
              {
                role: 'user',
                content: `Analyze these emails from ${email}:
                  ${chunk.map(e => `
                    From: ${e.from}
                    Subject: ${e.subject}
                    Content: ${e.snippet || e.body || ''}
                  `).join('\n---\n')}
                  
                  Return as JSON:
                  {
                    "communication_style": "brief description",
                    "interests": ["interest1", "interest2"],
                    "personality_traits": ["trait1", "trait2"]
                  }`
              }
            ],
            temperature: 0.7
          });

          const insight = JSON.parse(cleanJsonResponse(response.choices[0].message?.content || '{}'));
          chunkInsights.push(insight);
        }

        // Combine insights from all chunks
        const senderInfo = getSenderInfo(personEmails[0]);
        const combinedProfile = {
          email: senderInfo.email,
          name: senderInfo.name,
          communication_style: chunkInsights[0].communication_style,
          interests: [...new Set(chunkInsights.flatMap(i => i.interests))],
          personality_traits: [...new Set(chunkInsights.flatMap(i => i.personality_traits))]
        };

        profiles.push(combinedProfile);
      } catch (error) {
        console.error(`Error generating profile for ${email}:`, error);
      }
    }
    
    return NextResponse.json({ success: true, data: profiles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
