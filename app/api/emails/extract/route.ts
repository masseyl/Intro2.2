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
    model: 'gpt-4o',
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
    model: 'gpt-4o',
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

function stripUnnecessaryProps(obj: any): any {
  if (!obj) return obj;
  
  // If it's an array, map over it
  if (Array.isArray(obj)) {
    return obj.map(item => stripUnnecessaryProps(item));
  }
  
  // If it's an object, recursively clean it
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip headers and other unnecessary properties
      if (['headers', 'sizeEstimate', 'historyId', 'labelIds'].includes(key)) {
        continue;
      }
      
      // Keep only essential payload properties
      if (key === 'payload') {
        cleaned[key] = {
          mimeType: value.mimeType,
          body: value.body,
          parts: stripUnnecessaryProps(value.parts)
        };
        continue;
      }
      
      cleaned[key] = stripUnnecessaryProps(value);
    }
    return cleaned;
  }
  
  return obj;
}

async function processEmails(rawEmails: any[]) {
  // Step 1: Strip unnecessary data and clean
  const strippedEmails = rawEmails
    .map(stripUnnecessaryProps)
    .filter(email => {
      // Filter out empty messages
      const body = extractEmailText(email);
      return body && body.trim().length > 0;
    });

  // Step 2: Basic extraction and cleaning
  const cleanedEmails = strippedEmails.map(email => ({
    messageId: email.id,
    threadId: email.threadId,
    body: extractEmailText(email),
    internalDate: email.internalDate,
    headers: email.payload?.headers || []
  }));

  // Step 2: Deduplicate by thread and extract metadata
  const threadMap = new Map();
  cleanedEmails.forEach(email => {
    const existingEmail = threadMap.get(email.threadId);
    if (!existingEmail || parseInt(email.internalDate) > parseInt(existingEmail.internalDate)) {
      const headers = email.headers;
      threadMap.set(email.threadId, {
        messageId: email.messageId,
        threadId: email.threadId,
        date: new Date(parseInt(email.internalDate)).toISOString(),
        sender: extractEmailAddress(headers.find(h => h.name.toLowerCase() === 'from')?.value || ''),
        recipients: extractEmailAddresses(headers.find(h => h.name.toLowerCase() === 'to')?.value || ''),
        subject: headers.find(h => h.name.toLowerCase() === 'subject')?.value || '',
        body: email.body
      });
    }
  });

  // Step 3: Convert to array and return
  return Array.from(threadMap.values());
}

// Main route handler
export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendUpdate = async (type: string, data: any) => {
    await writer.write(
      encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
    );
  };

  try {
    const { emails } = await request.json();
    const BATCH_SIZE = 5;
    const results = [];
    
    // Process emails in batches and send updates
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const processedBatch = await processEmails(batch);
      results.push(...processedBatch);
      
      await sendUpdate('emails', {
        processed: i + batch.length,
        total: emails.length,
        latestBatch: processedBatch
      });
    }
    
    // Process relationships with updates
    const participants = extractUniqueParticipants(results);
    const relationships = [];
    const totalRelationships = (participants.length * (participants.length - 1)) / 2;
    let processedRelationships = 0;
    
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const person1 = participants[i];
        const person2 = participants[j];
        const relevantEmails = results.filter(email => 
          isParticipantInEmail(email, person1) && 
          isParticipantInEmail(email, person2)
        );
        
        if (relevantEmails.length > 0) {
          const analysis = await generateAllRelationships([{
            person1,
            person2,
            emails: relevantEmails
          }]);
          
          const newRelationship = {
            participants: [person1, person2],
            analysis: analysis[0]
          };
          relationships.push(newRelationship);
          
          processedRelationships++;
          await sendUpdate('relationship', {
            processed: processedRelationships,
            total: totalRelationships,
            latest: newRelationship
          });
        }
      }
    }

    await writer.close();
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error: any) {
    await sendUpdate('error', { message: error.message });
    await writer.close();
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}

// Helper functions
function extractEmailText(email: any): string {
  // If this is a threaded message, combine all messages in the thread
  if (email.thread && email.thread.messages) {
    return email.thread.messages
      .map((message: any) => extractSingleMessageText(message))
      .filter(Boolean)  // Remove any null/undefined/empty messages
      .join('\n\n--- Next Message ---\n\n');
  }
  
  // If not a thread, process as single message
  return extractSingleMessageText(email);
}

function extractSingleMessageText(message: any): string {
  // Just log the raw message structure first so we can see what we're dealing with
  console.log('Raw message structure:', JSON.stringify(message, null, 2));
  
  if (!message.payload) return '';
  
  // Let's look at what's in the payload
  console.log('Payload:', JSON.stringify(message.payload, null, 2));
  
  // And specifically what's in parts
  if (message.payload.parts) {
    console.log('Parts:', JSON.stringify(message.payload.parts, null, 2));
  }
  
  return 'Debug mode - check console logs';
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

function isParticipantInEmail(email: any, participant: EmailParticipant) {
  // Check if participant is sender
  if (email.sender?.email === participant.email) {
    return true;
  }
  
  // Check if participant is in recipients
  return email.recipients?.some((recipient: any) => 
    recipient.email === participant.email
  ) || false;
}
