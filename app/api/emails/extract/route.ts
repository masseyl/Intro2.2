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

async function generateAllProfiles(participants: EmailParticipant[], emailsByPerson: Map<string, any[]>) {
  const participantsData = participants.map(participant => ({
    email: participant.email,
    name: participant.name,
    emails: emailsByPerson.get(participant.email) || []
  }));

  const prompt = `
Analyze the following email data for multiple participants. For each participant, create a detailed profile.

${participantsData.map(p => `
--- Participant: ${p.name} <${p.email}> ---
${p.emails.map(email => `
From: ${email.sender?.name} <${email.sender?.email}>
Subject: ${email.subject}
Body: ${email.body}
`).join('---')}
`).join('\n\n')}

For each participant, provide a detailed profile in the following format:
{
  "email": "participant's email",
  "profile": {
    "characteristics": "detailed personality traits and style",
    "demeanor": "specific observations about tone",
    "interests": ["specific interests"],
    "communication_style": "detailed communication patterns"
  }
}

Return an array of profiles for all participants.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert communication analyst. Return only valid JSON array without markdown formatting.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 4000,
    temperature: 0.7
  });

  return JSON.parse(cleanJsonResponse(response.choices[0].message?.content || '[]'));
}

async function generateAllRelationships(relationships: Array<{person1: EmailParticipant, person2: EmailParticipant, emails: any[]}>) {
  const prompt = `
Analyze the relationships between the following pairs of participants:

${relationships.map(r => `
--- Relationship: ${r.person1.name} <${r.person1.email}> and ${r.person2.name} <${r.person2.email}> ---
${r.emails.map(email => `
From: ${email.sender?.name} <${email.sender?.email}>
To: ${email.recipients?.map((rec: any) => `${rec.name} <${rec.email}>`).join(', ')}
Subject: ${email.subject}
Body: ${email.body}
`).join('---')}
`).join('\n\n')}

For each relationship pair, provide an analysis in the following format:
{
  "participants": ["email1", "email2"],
  "analysis": {
    "shared_interests": ["specific interests"],
    "personality_overlaps": "detailed analysis",
    "sense_of_humor": "specific observations",
    "interaction_quality": "detailed assessment"
  }
}

Return an array of relationship analyses for all pairs.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert relationship analyst. Return only valid JSON array without markdown formatting.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 4000,
    temperature: 0.7
  });

  return JSON.parse(cleanJsonResponse(response.choices[0].message?.content || '[]'));
}

// Main route handler
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    console.log("No access token found in session");
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { emails } = await request.json();
    const extractedEmails = await Promise.all(emails.map(extractEntities));
    
    // Deduplicate messages within threads
    const threadMap = new Map();
    extractedEmails.forEach(email => {
      if (!threadMap.has(email.threadId)) {
        threadMap.set(email.threadId, email);
      }
    });
    
    const uniqueEmails = Array.from(threadMap.values());
    
    // Get all unique participants
    const participants = extractUniqueParticipants(uniqueEmails);
    
    // Generate profiles for each participant
    const profiles = await Promise.all(
      participants.map(async participant => {
        // Filter emails where this person is sender or recipient
        const relevantEmails = uniqueEmails.filter(email => 
          email.sender?.email === participant.email ||
          email.recipients?.some((r: any) => r.email === participant.email)
        );
        
        const profile = await generateAllProfiles([participant], new Map([[participant.email, relevantEmails]]));
        return {
          participant,
          profile
        };
      })
    );

    // Generate relationship graph
    const relationships = [];
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const person1 = participants[i];
        const person2 = participants[j];
        
        // Find emails between these two people
        const relevantEmails = uniqueEmails.filter(email =>
          (email.sender?.email === person1.email && 
           email.recipients?.some((r: any) => r.email === person2.email)) ||
          (email.sender?.email === person2.email && 
           email.recipients?.some((r: any) => r.email === person1.email))
        );
        
        if (relevantEmails.length > 0) {
          const analysis = await generateAllRelationships([{
            person1,
            person2,
            emails: relevantEmails
          }]);
          relationships.push({
            participants: [person1, person2],
            analysis: analysis[0] // Take first result since we're only analyzing one pair
          });
        }
      }
    }

    // Save to database
    const client = await clientPromise;
    const db = client.db();
    
    // Save all profiles
    await Promise.all(profiles.map(({ participant, profile }) =>
      db.collection('profiles').updateOne(
        { email: participant.email },
        { 
          $set: {
            ...profile,
            name: participant.name,
            email: participant.email,
            userId: session.user?.id,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )
    ));
    
    // Save relationship graph
    await db.collection('relationships').updateOne(
      { userId: session.user?.id },
      { 
        $set: {
          relationships,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      results: extractedEmails,
      profiles,
      relationships
    });
    
  } catch (error: any) {
    console.error('Error during processing:', error);
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

async function extractEntities(email: any) {
  // Extract headers first
  const headers = email.payload?.headers || [];
  const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  
  // Get body text using existing extractEmailText function
  const bodyText = extractEmailText(email);

  // Create structured email object directly without using OpenAI
  return {
    sender: extractEmailAddress(getHeader('from')),
    recipients: extractEmailAddresses(getHeader('to')),
    date: getHeader('date'),
    subject: getHeader('subject'),
    body: bodyText,
    messageId: email.id,
    threadId: email.threadId
  };
}

// Helper functions to parse email addresses
function extractEmailAddress(headerValue: string) {
  const match = headerValue.match(/(.*?)\s*<?([^>]+@[^>]+)>?/);
  return {
    name: match ? match[1].trim().replace(/["']/g, '') : '',
    email: match ? match[2].trim() : headerValue.trim()
  };
}

function extractEmailAddresses(headerValue: string) {
  return headerValue.split(/,\s*/).map(addr => extractEmailAddress(addr));
}
